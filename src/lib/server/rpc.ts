import { createPublicClient, defineChain, http } from "viem";

export const RPC_URL = process.env.ROBINHOOD_RPC_URL || "https://rpc.mainnet.chain.robinhood.com";

export const robinhood = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
  blockExplorers: { default: { name: "Robinhood Explorer", url: "https://robin.etherscan.io" } },
  contracts: { multicall3: { address: "0xcA11bde05977b3631167028862bE2a173976CA11" } },
});

let client: ReturnType<typeof createPublicClient> | null = null;

/** Server-side reader. One shared client, batched JSON-RPC, one retry. */
export function serverClient() {
  return (client ??= createPublicClient({
    chain: robinhood,
    transport: http(RPC_URL, { batch: { batchSize: 24, wait: 8 }, retryCount: 2, retryDelay: 300, timeout: 20_000 }),
  }));
}

/**
 * The only JSON-RPC methods the browser may relay through /api/rpc. Reads
 * and simulations only — no raw transactions, no logs scans, no storage.
 */
export const READ_ONLY_METHODS = new Set([
  "eth_chainId",
  "eth_blockNumber",
  "eth_call",
  "eth_getBalance",
  "eth_estimateGas",
  "eth_gasPrice",
  "eth_maxPriorityFeePerGas",
  "eth_feeHistory",
  "eth_getTransactionReceipt",
  "eth_getTransactionByHash",
  "eth_getBlockByNumber",
  "eth_getCode",
  "eth_getTransactionCount",
]);

type JsonRpcRequest = { jsonrpc?: string; id?: number | string | null; method?: string; params?: unknown[] };

export async function forwardRpc(body: unknown): Promise<{ status: number; payload: unknown }> {
  const requests = (Array.isArray(body) ? body : [body]) as JsonRpcRequest[];
  if (requests.length === 0 || requests.length > 50) return { status: 400, payload: { error: "Invalid RPC batch" } };
  for (const request of requests) {
    if (!request || typeof request.method !== "string" || !READ_ONLY_METHODS.has(request.method)) {
      return { status: 400, payload: { error: "Read-only RPC method required" } };
    }
  }
  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      requests.map((request) => ({ jsonrpc: "2.0", id: request.id ?? 1, method: request.method, params: request.params ?? [] })),
    ),
    cache: "no-store",
  });
  if (!response.ok) {
    return {
      status: 200,
      payload: requests.map((request) => ({
        jsonrpc: "2.0",
        id: request.id ?? 1,
        error: { code: -32602, message: "RPC request failed" },
      })),
    };
  }
  const results = (await response.json()) as unknown;
  const list = Array.isArray(results) ? results : [results];
  return { status: 200, payload: Array.isArray(body) ? list : list[0] };
}
