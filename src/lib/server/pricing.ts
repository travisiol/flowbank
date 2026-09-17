import type { Address } from "viem";

import { factoryAbi, poolAbi } from "@/lib/abi";
import { serverClient } from "@/lib/server/rpc";
import { priceFromSqrt } from "@/lib/v3";

export const WETH: Address = "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73";
export const USDG: Address = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168";
export const USDG_DECIMALS = 6;
export const FEE_TIERS = [100, 500, 3000, 10000] as const;

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

type PoolRef = { pool: Address; fee: number; token0: Address; token1: Address; liquidity: bigint; sqrtPriceX96: bigint };

const poolCache = new Map<string, { at: number; pools: PoolRef[] }>();
const POOL_TTL = 20_000;

/** Every initialised V3 pool for a pair across the four fee tiers, with live liquidity and price. */
export async function poolsForPair(factory: Address, a: Address, b: Address): Promise<PoolRef[]> {
  const key = [factory, a, b].map((x) => x.toLowerCase()).sort().join(":");
  const hit = poolCache.get(key);
  if (hit && Date.now() - hit.at < POOL_TTL) return hit.pools;
  const client = serverClient();
  const addresses = await client.multicall({
    contracts: FEE_TIERS.map((fee) => ({ address: factory, abi: factoryAbi, functionName: "getPool", args: [a, b, fee] }) as const),
    allowFailure: true,
  });
  const candidates: Array<{ fee: number; pool: Address }> = [];
  addresses.forEach((result, index) => {
    const pool = result.status === "success" ? (result.result as Address) : null;
    if (pool && !/^0x0{40}$/i.test(pool)) candidates.push({ fee: FEE_TIERS[index], pool });
  });
  if (candidates.length === 0) {
    poolCache.set(key, { at: Date.now(), pools: [] });
    return [];
  }
  const reads = await client.multicall({
    contracts: candidates.flatMap((c) => [
      { address: c.pool, abi: poolAbi, functionName: "slot0" } as const,
      { address: c.pool, abi: poolAbi, functionName: "liquidity" } as const,
    ]),
    allowFailure: true,
  });
  const [token0, token1] = [a, b].map((x) => x.toLowerCase()).sort() as [string, string];
  const pools: PoolRef[] = [];
  candidates.forEach((c, i) => {
    const slot0 = reads[i * 2];
    const liquidity = reads[i * 2 + 1];
    if (slot0.status !== "success" || liquidity.status !== "success") return;
    const sqrt = (slot0.result as readonly [bigint, ...unknown[]])[0];
    if (sqrt === 0n) return;
    pools.push({
      pool: c.pool,
      fee: c.fee,
      token0: (same(a, token0) ? a : b) as Address,
      token1: (same(a, token1) ? a : b) as Address,
      liquidity: liquidity.result as bigint,
      sqrtPriceX96: sqrt,
    });
  });
  poolCache.set(key, { at: Date.now(), pools });
  return pools;
}

/** Price of `token` in units of `quote`, read from the deepest pool of the pair. */
export async function spotPrice(
  factory: Address,
  token: Address,
  tokenDecimals: number,
  quote: Address,
  quoteDecimals: number,
): Promise<number | null> {
  const pools = (await poolsForPair(factory, token, quote)).filter((p) => p.liquidity > 0n);
  if (pools.length === 0) return null;
  const deepest = pools.reduce((best, p) => (p.liquidity > best.liquidity ? p : best));
  const tokenIs0 = same(deepest.token0, token);
  // slot0 gives token1 per token0.
  const price1per0 = priceFromSqrt(deepest.sqrtPriceX96, tokenIs0 ? tokenDecimals : quoteDecimals, tokenIs0 ? quoteDecimals : tokenDecimals);
  return tokenIs0 ? price1per0 : 1 / price1per0;
}

const usdCache = new Map<string, { at: number; price: number | null }>();

/** USD price of any listed asset: USDG is the dollar, others via USDG or via WETH. */
export async function usdPrice(factory: Address, asset: Address, decimals: number): Promise<number | null> {
  if (same(asset, USDG)) return 1;
  const key = asset.toLowerCase();
  const hit = usdCache.get(key);
  if (hit && Date.now() - hit.at < POOL_TTL) return hit.price;
  let price = await spotPrice(factory, asset, decimals, USDG, USDG_DECIMALS);
  if (price === null && !same(asset, WETH)) {
    const [inEth, ethUsd] = await Promise.all([spotPrice(factory, asset, decimals, WETH, 18), spotPrice(factory, WETH, 18, USDG, USDG_DECIMALS)]);
    price = inEth !== null && ethUsd !== null ? inEth * ethUsd : null;
  }
  usdCache.set(key, { at: Date.now(), price });
  return price;
}

export const ethUsdPrice = (factory: Address) => spotPrice(factory, WETH, 18, USDG, USDG_DECIMALS);
