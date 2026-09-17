import { readFile } from "node:fs/promises";

import bundled from "@/../config/launch.json";
import type { LaunchManifest } from "@/lib/types";

const TTL_MS = 10_000;

let cached: { at: number; manifest: LaunchManifest } | null = null;

/**
 * The deployment manifest. `config/launch.json` ships with the build; when
 * FLOWBANK_LAUNCH_MANIFEST names a file on disk that file wins and is
 * re-read every ten seconds, so a worker that activates the protocol can
 * rewrite it and the site flips to the live screens without a rebuild.
 * FLOWBANK_PHASE=prelaunch forces the pre-launch screens for rehearsals.
 */
export async function loadManifest(): Promise<LaunchManifest> {
  const now = Date.now();
  if (cached && now - cached.at < TTL_MS) return cached.manifest;
  const override = process.env.FLOWBANK_LAUNCH_MANIFEST;
  const source = override ? (JSON.parse(await readFile(override, "utf8")) as Record<string, unknown>) : { ...bundled };
  const { $comment: _comment, ...rest } = source as Record<string, unknown> & { $comment?: string };
  void _comment;
  const manifest = rest as unknown as LaunchManifest;
  const phase = process.env.FLOWBANK_PHASE;
  if (phase === "prelaunch" || phase === "active") manifest.phase = phase;
  manifest.active = manifest.phase === "active";
  cached = { at: now, manifest };
  return manifest;
}

export const isActive = (manifest: LaunchManifest) => manifest.phase === "active";
