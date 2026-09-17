import { formatEther, parseAbiItem, type Address } from "viem";

import { curveAbi, feeAdapterAbi } from "@/lib/abi";
import { ethUsdPrice } from "@/lib/server/pricing";
import { readPools, reserveUsd } from "@/lib/server/pools";
import { serverClient } from "@/lib/server/rpc";
import type { LaunchManifest, LaunchpadStatus } from "@/lib/types";

const TTL_MS = 30_000;
const NATIVE: Address = "0x0000000000000000000000000000000000000000";
const LOG_CHUNK = 20_000n;
const creatorFeesClaimed = parseAbiItem("event CreatorFeesClaimed(address currency, address to, uint256 amount)");

let cached: { at: number; key: string; status: LaunchpadStatus } | null = null;
let claimedCache: { at: number; from: bigint; total: bigint; scannedTo: bigint } | null = null;

const trim = (value: string, digits: number) => {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(digits).replace(/(\.\d*?[1-9])0+$|\.0+$/, "$1") : value;
};

/**
 * State of the Degen launch venue for the token: how far the bonding curve
 * got, whether it graduated, and the creator fees it has produced so far
 * (claimed through the fee adapter plus whatever is still owed).
 */
export async function readLaunchpad(manifest: LaunchManifest): Promise<LaunchpadStatus | null> {
  if (!manifest.curve) return null;
  const key = `${manifest.token}:${manifest.curve}`;
  if (cached && cached.key === key && Date.now() - cached.at < TTL_MS) return cached.status;
  const client = serverClient();

  const [reserves, threshold, graduated] = await client.multicall({
    contracts: [
      { address: manifest.curve, abi: curveAbi, functionName: "getReserves" } as const,
      { address: manifest.curve, abi: curveAbi, functionName: "graduationThreshold" } as const,
      { address: manifest.curve, abi: curveAbi, functionName: "graduated" } as const,
    ],
    allowFailure: true,
  });
  const curveEth = reserves.status === "success" ? formatEther((reserves.result as readonly [bigint, bigint])[0]) : "0";
  const thresholdEth = threshold.status === "success" ? formatEther(threshold.result as bigint) : "0";

  const [claimed, owed, ethUsd, reservePrice, pools] = await Promise.all([
    totalClaimed(manifest),
    client
      .readContract({ address: manifest.feeAdapter, abi: feeAdapterAbi, functionName: "creatorOwed", args: [NATIVE, manifest.token] })
      .catch(() => 0n),
    ethUsdPrice(manifest.factory).catch(() => null),
    reserveUsd(manifest).catch(() => null),
    readPools(manifest).catch(() => null),
  ]);
  const feesWei = claimed + owed;
  const feesEth = Number(formatEther(feesWei));
  const usdg = pools?.pools.find((p) => p.symbol === "USDG");

  const status: LaunchpadStatus = {
    token: manifest.token,
    graduated: graduated.status === "success" ? Boolean(graduated.result) : false,
    curveEth: trim(curveEth, 3),
    thresholdEth: trim(thresholdEth, 1),
    priceEth: reservePrice !== null && ethUsd ? (reservePrice / ethUsd).toPrecision(6) : null,
    priceUsd: reservePrice !== null ? reservePrice.toPrecision(6) : null,
    marketCapUsd: null,
    feesEarnedEth: trim(feesEth.toString(), 3),
    feesEarnedUsd: ethUsd ? `$${Math.round(feesEth * ethUsd).toLocaleString("en-US")}` : "—",
    initialPool: usdg && usdg.tvlUsd !== null ? { address: usdg.pool, liquidityUsd: `$${Math.round(usdg.tvlUsd).toLocaleString("en-US")}` } : null,
  };
  cached = { at: Date.now(), key, status };
  return status;
}

/** Sum of CreatorFeesClaimed amounts since deployment, scanned in chunks and extended incrementally. */
async function totalClaimed(manifest: LaunchManifest): Promise<bigint> {
  const client = serverClient();
  const from = BigInt(manifest.tokenDeploymentBlock ?? manifest.deploymentBlock ?? "0");
  const latest = await client.getBlockNumber();
  let total = 0n;
  let start = from;
  if (claimedCache && claimedCache.from === from) {
    total = claimedCache.total;
    start = claimedCache.scannedTo + 1n;
  }
  for (let cursor = start; cursor <= latest; cursor += LOG_CHUNK) {
    const to = cursor + LOG_CHUNK - 1n > latest ? latest : cursor + LOG_CHUNK - 1n;
    try {
      const logs = await client.getLogs({ address: manifest.feeAdapter, event: creatorFeesClaimed, fromBlock: cursor, toBlock: to });
      for (const log of logs) {
        if (log.args.currency?.toLowerCase() === NATIVE) total += log.args.amount ?? 0n;
      }
    } catch {
      // Keep whatever was already summed; the next request resumes from here.
      claimedCache = { at: Date.now(), from, total, scannedTo: cursor - 1n };
      return total;
    }
  }
  claimedCache = { at: Date.now(), from, total, scannedTo: latest };
  return total;
}
