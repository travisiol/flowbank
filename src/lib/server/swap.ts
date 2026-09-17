import { randomUUID } from "node:crypto";
import { encodeFunctionData, encodePacked, isAddress, maxUint256, parseAbi, parseUnits, type Address, type Hex } from "viem";

import { quoterAbi, swapRouterAbi } from "@/lib/abi";
import { liquidityPolicy } from "@/lib/rollout";
import { poolsForPair, USDG, USDG_DECIMALS, WETH } from "@/lib/server/pricing";
import { serverClient } from "@/lib/server/rpc";
import { site } from "@/lib/site";
import type { LaunchManifest, PreparedSwap, RoutePool, SwapConfig, SwapQuote, SwapRoute, SwapToken } from "@/lib/types";
import { applySlippage } from "@/lib/v3";

/** Uniswap V3 periphery on Robinhood Chain — shared infrastructure, not part of the protocol deployment. */
export const SWAP_ROUTER: Address = "0xcaf681a66d020601342297493863e78c959e5cb2";
export const QUOTER: Address = "0x33e885ed0ec9bf04ecfb19341582aadcb4c8a9e7";

const QUOTE_TTL_MS = 45_000;
const MAX_IMPACT_BPS = 300;
const GAS_OVERHEAD = 60_000n;
const PROBE_WEI = 10n ** 15n;

const routerMulticallAbi = parseAbi(["function multicall(uint256 deadline, bytes[] data) payable returns (bytes[] results)"]);

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export class SwapError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

const BASE_TOKENS: SwapToken[] = [
  { symbol: "ETH", name: "Ether", address: WETH, decimals: 18, native: true, tradeEnabled: true },
  { symbol: "WETH", name: "Wrapped Ether", address: WETH, decimals: 18, tradeEnabled: true },
  { symbol: "USDG", name: "Global Dollar", address: USDG, decimals: USDG_DECIMALS, tradeEnabled: true },
  ...liquidityPolicy.markets
    .filter((m) => m.symbol !== "USDG")
    .map((m) => ({ symbol: m.symbol, name: m.name, address: m.asset as Address, decimals: m.decimals, tradeEnabled: true })),
];

export function swapTokens(manifest: LaunchManifest): SwapToken[] {
  const tokens = [...BASE_TOKENS];
  if (manifest.phase === "active" && manifest.token) {
    tokens.push({ symbol: site.ticker, name: site.name, address: manifest.token, decimals: manifest.tokenDecimals, tradeEnabled: true });
  }
  return tokens;
}

export function swapConfig(manifest: LaunchManifest): SwapConfig {
  return {
    chainId: manifest.chainId,
    tokens: swapTokens(manifest),
    router: SWAP_ROUTER,
    quoter: QUOTER,
    factory: manifest.factory,
    active: manifest.phase === "active",
    flowbankPools: manifest.phase === "active" ? manifest.markets.map((m) => m.pool) : [],
    aggregator: "not-configured",
  };
}

export function parseAmount(raw: string, decimals: number): bigint {
  if (raw.length > 80 || !/^\d+(\.\d+)?$/.test(raw) || (raw.split(".")[1]?.length ?? 0) > decimals) {
    throw new SwapError("Enter a positive amount within the token precision.");
  }
  const value = parseUnits(raw, decimals);
  if (value <= 0n || value > maxUint256) throw new SwapError("Amount is outside the supported range.");
  return value;
}

type Hop = { pool: RoutePool; tokenIn: Address; tokenOut: Address; sqrtBefore: bigint };
type StoredRoute = SwapRoute & { hops: Hop[] };
type StoredQuote = {
  quote: SwapQuote;
  routes: StoredRoute[];
  slippageBps: number;
};

const quotes = new Map<string, StoredQuote>();

function publicRoute({ hops, ...route }: StoredRoute): SwapRoute {
  void hops;
  return route;
}

function prune() {
  const now = Date.now();
  for (const [id, stored] of quotes) if (stored.quote.expiresAt + 60_000 < now) quotes.delete(id);
}

function encodePath(hops: Hop[]): Hex {
  const types: string[] = ["address"];
  const values: unknown[] = [hops[0].tokenIn];
  for (const hop of hops) {
    types.push("uint24", "address");
    values.push(hop.pool.fee, hop.tokenOut);
  }
  return encodePacked(types, values);
}

async function pairPools(manifest: LaunchManifest, a: Address, b: Address, limit: number): Promise<RoutePool[]> {
  const flowbankPools = new Set(manifest.phase === "active" ? manifest.markets.map((m) => m.pool.toLowerCase()) : []);
  const pools = (await poolsForPair(manifest.factory, a, b)).filter((p) => p.liquidity > 0n);
  return pools
    .sort((x, y) => (y.liquidity > x.liquidity ? 1 : y.liquidity < x.liquidity ? -1 : 0))
    .slice(0, limit)
    .map((p) => ({ token0: p.token0, token1: p.token1, fee: p.fee, pool: p.pool, flowbank: flowbankPools.has(p.pool.toLowerCase()) }));
}

async function sqrtBefore(manifest: LaunchManifest, pool: RoutePool): Promise<bigint> {
  const refs = await poolsForPair(manifest.factory, pool.token0, pool.token1);
  return refs.find((r) => same(r.pool, pool.pool))?.sqrtPriceX96 ?? 0n;
}

/** Enumerate direct pools and one-intermediate paths, then quote them all in one multicall. */
export async function buildQuote(
  manifest: LaunchManifest,
  params: { from: string; to: string; amount: string; slippageBps: number; account: string | null },
): Promise<SwapQuote> {
  prune();
  const tokens = swapTokens(manifest);
  const tokenIn = tokens.find((t) => t.symbol === params.from);
  const tokenOut = tokens.find((t) => t.symbol === params.to);
  if (!tokenIn || !tokenOut) throw new SwapError("Unknown token. Refresh the token list and try again.");
  if (same(tokenIn.address, tokenOut.address)) {
    throw new SwapError("Choose two different assets. ETH and WETH represent the same routing asset.");
  }
  if (!Number.isInteger(params.slippageBps) || params.slippageBps < 1 || params.slippageBps > 1000) {
    throw new SwapError("Slippage must be between 0.01% and 10%.");
  }
  if (params.account !== null && !isAddress(params.account)) throw new SwapError("Invalid account address.");
  const amountIn = parseAmount(params.amount, tokenIn.decimals);

  const client = serverClient();
  const candidates: Hop[][] = [];
  for (const pool of await pairPools(manifest, tokenIn.address, tokenOut.address, 4)) {
    candidates.push([{ pool, tokenIn: tokenIn.address, tokenOut: tokenOut.address, sqrtBefore: 0n }]);
  }
  const intermediates = tokens.filter(
    (t, i, all) => !same(t.address, tokenIn.address) && !same(t.address, tokenOut.address) && all.findIndex((o) => same(o.address, t.address)) === i,
  );
  for (const mid of intermediates) {
    const [first, second] = await Promise.all([
      pairPools(manifest, tokenIn.address, mid.address, 2),
      pairPools(manifest, mid.address, tokenOut.address, 2),
    ]);
    for (const a of first) for (const b of second) {
      candidates.push([
        { pool: a, tokenIn: tokenIn.address, tokenOut: mid.address, sqrtBefore: 0n },
        { pool: b, tokenIn: mid.address, tokenOut: tokenOut.address, sqrtBefore: 0n },
      ]);
    }
  }
  if (candidates.length === 0) throw new SwapError("No pool with liquidity connects these tokens right now.");
  for (const hops of candidates) for (const hop of hops) hop.sqrtBefore = await sqrtBefore(manifest, hop.pool);

  const [block, gasPrice, quoted] = await Promise.all([
    client.getBlockNumber(),
    client.getGasPrice(),
    client.multicall({
      contracts: candidates.map((hops) => ({ address: QUOTER, abi: quoterAbi, functionName: "quoteExactInput", args: [encodePath(hops), amountIn] }) as const),
      allowFailure: true,
    }),
  ]);

  const symbolFor = (address: Address, position: "in" | "out" | "mid") => {
    if (position === "in") return tokenIn.symbol;
    if (position === "out") return tokenOut.symbol;
    return tokens.find((t) => same(t.address, address) && !t.native)?.symbol ?? tokens.find((t) => same(t.address, address))?.symbol ?? address;
  };

  const gasRate = await outputPerWei(manifest, tokenOut);
  const routes: StoredRoute[] = [];
  candidates.forEach((hops, index) => {
    const result = quoted[index];
    if (result.status !== "success") return;
    const [amountOut, sqrtAfterList, , gasEstimate] = result.result as readonly [bigint, readonly bigint[], readonly number[], bigint];
    if (amountOut <= 0n) return;
    let impact = 0;
    let impactKnown = true;
    hops.forEach((hop, i) => {
      const before = hop.sqrtBefore;
      const after = sqrtAfterList[i];
      if (!before || !after) {
        impactKnown = false;
        return;
      }
      const ratio = Number(after) / Number(before);
      impact += Math.abs(1 - ratio * ratio) * 10_000;
    });
    const impactBps = impactKnown ? Math.round(impact) : null;
    const gasUnits = gasEstimate + GAS_OVERHEAD + BigInt(hops.length) * 20_000n;
    const gasWei = gasUnits * gasPrice;
    const gasOutput = gasRate === null ? null : (gasWei * gasRate.numerator) / gasRate.denominator;
    const path = encodePath(hops);
    const pools = hops.map((h) => h.pool);
    routes.push({
      id: path,
      source: "v3",
      label: pools.some((p) => p.flowbank) ? `Via ${site.name}` : hops.length === 1 ? "Direct pool" : "Via market pools",
      symbols: [symbolFor(tokenIn.address, "in"), ...hops.map((h, i) => symbolFor(h.tokenOut, i === hops.length - 1 ? "out" : "mid"))],
      path,
      pools,
      amountOut: amountOut.toString(),
      minimumOut: applySlippage(amountOut, params.slippageBps).toString(),
      gasWei: gasWei.toString(),
      gasOutput: gasOutput?.toString() ?? null,
      netOut: gasOutput === null ? null : (amountOut - gasOutput).toString(),
      impactBps,
      executable: impactBps !== null && impactBps <= MAX_IMPACT_BPS && tokenIn.tradeEnabled && tokenOut.tradeEnabled,
      hops,
    });
  });
  if (routes.length === 0) throw new SwapError("No route could be quoted for this amount. Try a smaller amount.");

  const ranking: SwapQuote["ranking"] = routes.every((r) => r.netOut !== null) ? "net" : "output";
  routes.sort((a, b) => {
    const x = BigInt(ranking === "net" ? a.netOut! : a.amountOut);
    const y = BigInt(ranking === "net" ? b.netOut! : b.amountOut);
    return y > x ? 1 : y < x ? -1 : 0;
  });
  const warnings: string[] = [];
  if (ranking === "output") warnings.push("Network costs could not be converted into the output token, so routes are sorted by quoted output and gas is additional.");
  if (routes.every((r) => !r.executable)) warnings.push("No checked route can execute at this size: the estimated price impact is too high or unverified.");

  const quote: SwapQuote = {
    id: randomUUID(),
    tokenIn,
    tokenOut,
    amountIn: amountIn.toString(),
    expiresAt: Date.now() + QUOTE_TTL_MS,
    request: { ...params, account: params.account as Address | null },
    block: block.toString(),
    ranking,
    routes: routes.map(publicRoute),
    warnings,
  };
  quotes.set(quote.id, { quote, routes, slippageBps: params.slippageBps });
  return quote;
}

/** How much of the output token one wei of gas buys, from a small live WETH quote. Null when unknown. */
async function outputPerWei(manifest: LaunchManifest, tokenOut: SwapToken): Promise<{ numerator: bigint; denominator: bigint } | null> {
  if (same(tokenOut.address, WETH)) return { numerator: 1n, denominator: 1n };
  const client = serverClient();
  const direct = await pairPools(manifest, WETH, tokenOut.address, 2);
  const paths: Hop[][] = direct.map((pool) => [{ pool, tokenIn: WETH, tokenOut: tokenOut.address, sqrtBefore: 0n }]);
  if (!same(tokenOut.address, USDG)) {
    const [a, b] = await Promise.all([pairPools(manifest, WETH, USDG, 1), pairPools(manifest, USDG, tokenOut.address, 1)]);
    if (a[0] && b[0]) {
      paths.push([
        { pool: a[0], tokenIn: WETH, tokenOut: USDG, sqrtBefore: 0n },
        { pool: b[0], tokenIn: USDG, tokenOut: tokenOut.address, sqrtBefore: 0n },
      ]);
    }
  }
  if (paths.length === 0) return null;
  const results = await client.multicall({
    contracts: paths.map((hops) => ({ address: QUOTER, abi: quoterAbi, functionName: "quoteExactInput", args: [encodePath(hops), PROBE_WEI] }) as const),
    allowFailure: true,
  });
  let best = 0n;
  for (const result of results) {
    if (result.status !== "success") continue;
    const out = (result.result as readonly [bigint, ...unknown[]])[0];
    if (out > best) best = out;
  }
  return best > 0n ? { numerator: best, denominator: PROBE_WEI } : null;
}

export async function prepareSwap(
  manifest: LaunchManifest,
  body: { quoteId?: unknown; routeId?: unknown; account?: unknown },
): Promise<PreparedSwap & { tokenIn: SwapToken; tokenOut: SwapToken; route: SwapRoute }> {
  prune();
  const stored = typeof body.quoteId === "string" ? quotes.get(body.quoteId) : undefined;
  if (!stored) throw new SwapError("Quote expired. Request a new quote.");
  if (Date.now() > stored.quote.expiresAt) throw new SwapError("Quote expired. Request a new quote.");
  const account = typeof body.account === "string" && isAddress(body.account) ? body.account : null;
  if (!account || !stored.quote.request.account || !same(stored.quote.request.account, account)) {
    throw new SwapError("Wallet changed. Get a new quote for this account.");
  }
  const route = stored.routes.find((r) => r.id === body.routeId);
  if (!route) throw new SwapError("Choose a route from the current quote.");
  if (manifest.phase !== "active") throw new SwapError("Trading opens after protocol activation.");
  if (!route.executable) throw new SwapError("This route cannot execute. Its price impact is too high or unverified.");

  const { quote } = stored;
  const amountIn = BigInt(quote.amountIn);
  const { result: fresh } = await serverClient().simulateContract({
    address: QUOTER,
    abi: quoterAbi,
    functionName: "quoteExactInput",
    args: [route.path, amountIn],
  });
  const freshOut = fresh[0];
  const minimumOut = applySlippage(freshOut, stored.slippageBps);
  const outNative = !!quote.tokenOut.native;
  const inNative = !!quote.tokenIn.native;
  const deadline = BigInt(Math.floor(quote.expiresAt / 1000));

  const calls: Hex[] = [
    encodeFunctionData({
      abi: swapRouterAbi,
      functionName: "exactInput",
      args: [{ path: route.path, recipient: outNative ? SWAP_ROUTER : account, amountIn, amountOutMinimum: minimumOut }],
    }),
  ];
  if (outNative) calls.push(encodeFunctionData({ abi: swapRouterAbi, functionName: "unwrapWETH9", args: [minimumOut, account] }));
  const data = encodeFunctionData({ abi: routerMulticallAbi, functionName: "multicall", args: [deadline, calls] });

  return {
    quoteId: quote.id,
    routeId: route.id,
    transaction: {
      to: SWAP_ROUTER,
      data,
      value: inNative ? amountIn.toString() : "0",
      spender: inNative ? null : SWAP_ROUTER,
      chainId: manifest.chainId,
      amountIn: amountIn.toString(),
      minimumOut: minimumOut.toString(),
      expiresAt: quote.expiresAt,
    },
    tokenIn: quote.tokenIn,
    tokenOut: quote.tokenOut,
    route: { ...publicRoute(route), minimumOut: minimumOut.toString(), amountOut: freshOut.toString() },
  };
}

export function publicPoolFeed(manifest: LaunchManifest, block: bigint) {
  const policySymbols = new Set<string>(liquidityPolicy.markets.map((m) => m.symbol));
  return {
    schemaVersion: 1,
    chainId: manifest.chainId,
    name: site.name,
    url: site.url,
    factory: manifest.factory,
    router: SWAP_ROUTER,
    quoter: QUOTER,
    block: block.toString(),
    pools:
      manifest.phase === "active"
        ? manifest.markets
            .filter((m) => policySymbols.has(m.symbol))
            .map((m) => ({ token0: m.token0, token1: m.token1, fee: m.fee, pool: m.pool, flowbank: true }))
        : [],
    quoteEndpoint: `${site.url}/api/swap/quote`,
    tokenList: `${site.url}/api/swap/tokens`,
    externalListingConfirmed: false,
  };
}

export function publicTokenList(manifest: LaunchManifest) {
  return {
    name: `${site.name} Robinhood Chain Tokens`,
    timestamp: new Date().toISOString(),
    version: { major: 1, minor: 1, patch: 0 },
    keywords: [site.name.toLowerCase(), "robinhood"],
    tokens: swapTokens(manifest)
      .filter((t) => !t.native)
      .map((t) => ({
        chainId: manifest.chainId,
        address: t.address,
        name: t.name,
        symbol: t.symbol,
        decimals: t.decimals,
        ...(t.symbol === site.ticker ? { logoURI: `${site.url}${site.brandImage}` } : {}),
      })),
  };
}
