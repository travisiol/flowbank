import { loadManifest } from "@/lib/server/manifest";
import { swapConfig } from "@/lib/server/swap";

export async function GET() {
  try {
    return Response.json(swapConfig(await loadManifest()), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Configuration unavailable." }, { status: 503 });
  }
}
