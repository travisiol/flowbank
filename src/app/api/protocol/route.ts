import { loadManifest } from "@/lib/server/manifest";
import { readProtocol } from "@/lib/server/protocol";

export async function GET() {
  try {
    return Response.json(await readProtocol(await loadManifest()), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Protocol data is temporarily unavailable." }, { status: 503 });
  }
}
