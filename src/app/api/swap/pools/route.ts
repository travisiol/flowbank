import { loadManifest } from "@/lib/server/manifest";
import { serverClient } from "@/lib/server/rpc";
import { publicPoolFeed } from "@/lib/server/swap";

/** Public pool feed for routers and aggregators. */
export async function GET() {
  try {
    const [manifest, block] = await Promise.all([loadManifest(), serverClient().getBlockNumber()]);
    return Response.json(publicPoolFeed(manifest, block), { headers: { "Cache-Control": "public, max-age=60" } });
  } catch {
    return Response.json({ error: "Pool feed unavailable." }, { status: 503 });
  }
}
