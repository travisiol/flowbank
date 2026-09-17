import { forwardRpc } from "@/lib/server/rpc";

const noStore = { "Cache-Control": "no-store" };

/** Same-origin JSON-RPC relay for the browser. Read-only methods only; batches supported. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Chain data is temporarily unavailable." }, { status: 503, headers: noStore });
  }
  try {
    const { status, payload } = await forwardRpc(body);
    return Response.json(payload, { status, headers: noStore });
  } catch {
    return Response.json({ error: "Chain data is temporarily unavailable." }, { status: 503, headers: noStore });
  }
}
