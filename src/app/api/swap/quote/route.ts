import { loadManifest } from "@/lib/server/manifest";
import { buildQuote, SwapError } from "@/lib/server/swap";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  try {
    const quote = await buildQuote(await loadManifest(), {
      from: query.get("from") ?? "",
      to: query.get("to") ?? "",
      amount: query.get("amount") ?? "",
      slippageBps: Number(query.get("slippageBps") ?? 50),
      account: query.get("account"),
    });
    return Response.json(quote, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof SwapError) return Response.json({ error: error.message }, { status: error.status });
    console.error("[swap/quote]", error instanceof Error ? error.message : error);
    return Response.json({ error: "Quote unavailable. Live pool data could not be read." }, { status: 503 });
  }
}
