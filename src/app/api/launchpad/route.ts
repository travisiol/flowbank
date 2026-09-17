import { readLaunchpad } from "@/lib/server/launchpad";
import { loadManifest } from "@/lib/server/manifest";

export async function GET() {
  try {
    const status = await readLaunchpad(await loadManifest());
    if (!status) return Response.json({ error: "No launch venue is configured." }, { status: 404 });
    return Response.json(status, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Launch venue data is temporarily unavailable." }, { status: 503 });
  }
}
