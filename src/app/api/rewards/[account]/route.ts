import { loadManifest } from "@/lib/server/manifest";
import { readRewards } from "@/lib/server/rewards";

/** Unclaimed holder-reward proofs for one account, newest epochs first. */
export async function GET(request: Request, { params }: { params: Promise<{ account: string }> }) {
  const { account } = await params;
  const cursor = Math.max(0, Number(new URL(request.url).searchParams.get("cursor") ?? 0) || 0);
  try {
    return Response.json(await readRewards(await loadManifest(), account, cursor), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Holder proofs are temporarily unavailable." }, { status: 503 });
  }
}
