import { formatUnits, type Address } from "viem";

import { erc20Abi, liquidityAbi, poolAbi, positionManagerAbi } from "@/lib/abi";
import { usdPrice } from "@/lib/server/pricing";
import { serverClient } from "@/lib/server/rpc";
import type { LaunchManifest, Market, PoolSnapshot, PoolsResponse } from "@/lib/types";
import { amountsForLiquidity, getSqrtRatioAtTick } from "@/lib/v3";

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const TTL_MS = 15_000;

let cached: { at: number; key: string; response: PoolsResponse } | null = null;

/**
 * Pool balances read from the chain and priced in USD. `reserveAmount` and
 * `assetAmount` are the pool’s token balances; `protocolTvlUsd` is the value
 * of the protocol-owned position for that market, `communityTvlUsd` the rest.
 * Anything that cannot be priced is reported as null, never estimated.
 */
export async function readPools(manifest: LaunchManifest): Promise<PoolsResponse> {
  const key = `${manifest.phase}:${manifest.token}:${manifest.markets.map((m) => m.pool).join(",")}`;
  if (cached && cached.key === key && Date.now() - cached.at < TTL_MS) return cached.response;
  if (manifest.phase !== "active") {
    return { phase: manifest.phase, pools: [], totalTvlUsd: 0 };
  }

  const client = serverClient();
  const markets = manifest.markets;

  const base = await client.multicall({
    contracts: markets.flatMap((m) => [
      { address: m.pool, abi: poolAbi, functionName: "slot0" } as const,
      { address: manifest.token, abi: erc20Abi, functionName: "balanceOf", args: [m.pool] } as const,
      { address: m.asset, abi: erc20Abi, functionName: "balanceOf", args: [m.pool] } as const,
      { address: manifest.liquidity, abi: liquidityAbi, functionName: "marketPosition", args: [m.pool] } as const,
    ]),
    allowFailure: true,
  });

  const positionIds = markets.map((_, i) => {
    const r = base[i * 4 + 3];
    return r.status === "success" ? (r.result as bigint) : 0n;
  });
  const positions = await client.multicall({
    contracts: positionIds.map((id) => ({ address: manifest.positionManager, abi: positionManagerAbi, functionName: "positions", args: [id] }) as const),
    allowFailure: true,
  });

  const reservePrice = await reserveUsd(manifest);
  const pools: PoolSnapshot[] = [];
  for (const [i, market] of markets.entries()) {
    const slot0 = base[i * 4];
    const reserveBalance = base[i * 4 + 1];
    const assetBalance = base[i * 4 + 2];
    const reserveAmount = reserveBalance.status === "success" ? Number(formatUnits(reserveBalance.result as bigint, manifest.tokenDecimals)) : 0;
    const assetAmount = assetBalance.status === "success" ? Number(formatUnits(assetBalance.result as bigint, market.decimals)) : 0;
    const assetPrice = await usdPrice(manifest.factory, market.asset, market.decimals);

    let tvlUsd: number | null = null;
    if (assetPrice !== null) {
      tvlUsd = reservePrice !== null ? reserveAmount * reservePrice + assetAmount * assetPrice : 2 * assetAmount * assetPrice;
    }

    let protocolTvlUsd: number | null = null;
    const position = positions[i];
    if (tvlUsd !== null && positionIds[i] !== 0n && position.status === "success" && slot0.status === "success") {
      const p = position.result as readonly [bigint, Address, Address, Address, number, number, number, bigint, bigint, bigint, bigint, bigint];
      const sqrt = (slot0.result as readonly [bigint, ...unknown[]])[0];
      const { amount0, amount1 } = amountsForLiquidity(sqrt, getSqrtRatioAtTick(p[5]), getSqrtRatioAtTick(p[6]), p[7]);
      const reserveIs0 = same(market.token0, manifest.token);
      const reserveSide = Number(formatUnits(reserveIs0 ? amount0 : amount1, manifest.tokenDecimals));
      const assetSide = Number(formatUnits(reserveIs0 ? amount1 : amount0, market.decimals));
      protocolTvlUsd =
        reservePrice !== null ? reserveSide * reservePrice + assetSide * assetPrice! : 2 * assetSide * assetPrice!;
      protocolTvlUsd = Math.min(protocolTvlUsd, tvlUsd);
    } else if (tvlUsd !== null && positionIds[i] === 0n) {
      protocolTvlUsd = 0;
    }

    pools.push({
      id: market.id,
      symbol: market.symbol,
      pool: market.pool,
      fee: market.fee,
      enabled: market.enabled,
      reserveAmount,
      assetAmount,
      tvlUsd,
      protocolTvlUsd,
      communityTvlUsd: tvlUsd !== null && protocolTvlUsd !== null ? Math.max(0, tvlUsd - protocolTvlUsd) : null,
    });
  }

  const response: PoolsResponse = {
    phase: "active",
    pools,
    totalTvlUsd: pools.reduce((sum, p) => sum + (p.tvlUsd ?? 0), 0),
  };
  cached = { at: Date.now(), key, response };
  return response;
}

/** FLOW priced in USD from its USDG market, or null before that pool exists. */
export async function reserveUsd(manifest: LaunchManifest): Promise<number | null> {
  const usdgMarket = manifest.markets.find((m: Market) => m.symbol === "USDG");
  if (!usdgMarket) return null;
  try {
    const slot0 = await serverClient().readContract({ address: usdgMarket.pool, abi: poolAbi, functionName: "slot0" });
    const sqrt = slot0[0];
    if (sqrt === 0n) return null;
    const ratio = Number(sqrt) / 2 ** 96;
    const reserveIs0 = same(usdgMarket.token0, manifest.token);
    const raw = ratio * ratio; // token1 per token0 in raw units
    const price = reserveIs0
      ? raw * 10 ** (manifest.tokenDecimals - usdgMarket.decimals)
      : (1 / raw) * 10 ** (manifest.tokenDecimals - usdgMarket.decimals);
    return Number.isFinite(price) && price > 0 ? price : null;
  } catch {
    return null;
  }
}
