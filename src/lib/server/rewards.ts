import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { isAddress, type Address, type Hex } from "viem";

import { holdersAbi } from "@/lib/abi";
import { serverClient } from "@/lib/server/rpc";
import type { HolderClaim, LaunchManifest, RewardsResponse } from "@/lib/types";

const PAGE = 20;

type EpochFile = {
  epoch: number;
  claims: Record<string, { amount: string; proof: Hex[] }>;
};

/**
 * Holder-reward proofs are published by the reward worker as one JSON file
 * per epoch in FLOWBANK_REWARDS_DIR (`<epoch>.json`, `{ epoch, claims: {
 * [account]: { amount, proof } } }`). The site only serves them, filtered to
 * the epochs the account has not yet claimed onchain. No file, no claims.
 */
export async function readRewards(manifest: LaunchManifest, account: string, cursor: number): Promise<RewardsResponse> {
  if (!isAddress(account)) return { claims: [], nextCursor: null };
  const dir = path.resolve(process.cwd(), process.env.FLOWBANK_REWARDS_DIR || "data/rewards");
  let files: string[] = [];
  try {
    files = (await readdir(dir)).filter((f) => /^\d+\.json$/.test(f));
  } catch {
    return { claims: [], nextCursor: null };
  }
  // Newest epochs first; `cursor` is an offset into that ordering.
  const epochs = files.map((f) => Number(f.replace(".json", ""))).sort((a, b) => b - a);
  const page = epochs.slice(cursor, cursor + PAGE);
  const lower = account.toLowerCase() as Address;
  const candidates: HolderClaim[] = [];
  for (const epoch of page) {
    try {
      const file = JSON.parse(await readFile(path.join(dir, `${epoch}.json`), "utf8")) as EpochFile;
      const entry = Object.entries(file.claims ?? {}).find(([addr]) => addr.toLowerCase() === lower)?.[1];
      if (entry) candidates.push({ epoch, amount: entry.amount, proof: entry.proof });
    } catch {
      // A malformed epoch file is reported as unavailable, never substituted.
    }
  }
  let claims = candidates;
  if (candidates.length && manifest.phase === "active") {
    const claimed = await serverClient().multicall({
      contracts: candidates.map(
        (c) => ({ address: manifest.holders, abi: holdersAbi, functionName: "hasClaimed", args: [BigInt(c.epoch), account as Address] }) as const,
      ),
      allowFailure: true,
    });
    claims = candidates.filter((_, i) => !(claimed[i].status === "success" && claimed[i].result === true));
  }
  return { claims, nextCursor: cursor + PAGE < epochs.length ? cursor + PAGE : null };
}
