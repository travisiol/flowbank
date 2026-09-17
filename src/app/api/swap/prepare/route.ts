import { loadManifest } from "@/lib/server/manifest";
import { prepareSwap, SwapError } from "@/lib/server/swap";

export async function POST(request: Request) {
  let body: { quoteId?: unknown; routeId?: unknown; account?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  try {
    return Response.json(await prepareSwap(await loadManifest(), body), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof SwapError) return Response.json({ error: error.message }, { status: error.status });
    console.error("[swap/prepare]", error instanceof Error ? error.message : error);
    return Response.json({ error: "The swap could not be prepared. Request a new quote." }, { status: 503 });
  }
}
