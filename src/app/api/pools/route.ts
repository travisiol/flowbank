import { loadManifest } from "@/lib/server/manifest";
import { readPools } from "@/lib/server/pools";

export async function GET() {
  try {
    return Response.json(await readPools(await loadManifest()), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Pool data is temporarily unavailable." }, { status: 503 });
  }
}
