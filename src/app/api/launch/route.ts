import { loadManifest } from "@/lib/server/manifest";

/** The deployment manifest: phase, contract addresses and registered markets. */
export async function GET() {
  try {
    return Response.json(await loadManifest(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Launch manifest unavailable." }, { status: 503 });
  }
}
