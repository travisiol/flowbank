import { holdersAbi, stakingAbi } from "@/lib/abi";
import { serverClient } from "@/lib/server/rpc";
import type { LaunchManifest, ProtocolStatus } from "@/lib/types";

const TTL_MS = 15_000;
let cached: { at: number; key: string; status: ProtocolStatus } | null = null;

/** Headline counters: registered markets, lifetime USDG funded into both reward contracts, confirmed block. */
export async function readProtocol(manifest: LaunchManifest): Promise<ProtocolStatus> {
  const key = `${manifest.phase}:${manifest.staking}:${manifest.holders}`;
  if (cached && cached.key === key && Date.now() - cached.at < TTL_MS) return cached.status;
  const client = serverClient();
  const block = await client.getBlockNumber();
  if (manifest.phase !== "active") {
    const status: ProtocolStatus = { phase: manifest.phase, poolCount: 0, rewardsFunded: null, rewardDecimals: manifest.rewardDecimals, block: block.toString() };
    cached = { at: Date.now(), key, status };
    return status;
  }
  const [staking, holders] = await client.multicall({
    contracts: [
      { address: manifest.staking, abi: stakingAbi, functionName: "totalFunded" } as const,
      { address: manifest.holders, abi: holdersAbi, functionName: "funded" } as const,
    ],
    allowFailure: true,
  });
  const funded =
    staking.status === "success" && holders.status === "success" ? ((staking.result as bigint) + (holders.result as bigint)).toString() : null;
  const status: ProtocolStatus = {
    phase: "active",
    poolCount: manifest.markets.length,
    rewardsFunded: funded,
    rewardDecimals: manifest.rewardDecimals,
    block: block.toString(),
  };
  cached = { at: Date.now(), key, status };
  return status;
}
