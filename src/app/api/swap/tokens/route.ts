import { loadManifest } from "@/lib/server/manifest";
import { publicTokenList } from "@/lib/server/swap";

/** Public token list (Uniswap token-list shape). */
export async function GET() {
  try {
    return Response.json(publicTokenList(await loadManifest()), { headers: { "Cache-Control": "public, max-age=60" } });
  } catch {
    return Response.json({ error: "Token list unavailable." }, { status: 503 });
  }
}
