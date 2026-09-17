"use client";

import { createPublicClient, createWalletClient, custom, defineChain, http, type Address, type EIP1193Provider } from "viem";

export type WalletSnapshot = { account: Address | null; provider: EIP1193Provider | null };

/**
 * Browser-side chain client. The page never talks to the Robinhood RPC
 * directly: every read goes through the same-origin /api/rpc proxy, which
 * only forwards read-only methods.
 */
export function robinhoodClient(chainId: number) {
  return createPublicClient({
    chain: defineChain({
      id: chainId,
      name: "Robinhood Chain",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: ["/api/rpc"] } },
    }),
    transport: http("/api/rpc", { batch: { batchSize: 12, wait: 16 }, retryCount: 1, retryDelay: 400 }),
  });
}

export function walletClientFor(provider: EIP1193Provider, chainId: number, account: Address) {
  return createWalletClient({ account, chain: robinhoodClient(chainId).chain, transport: custom(provider) });
}

export const sameAddress = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/**
 * Re-checks the connected wallet right before a transaction is built and
 * again before it is sent: same account as when the review opened, same
 * provider object, chain still the expected one.
 */
export async function verifyWallet(read: () => WalletSnapshot, expected: Address | null, chainId: number) {
  const { account, provider } = read();
  if (!account || !provider || !expected || !sameAddress(account, expected)) {
    throw new Error("Wallet changed. Reconnect and review again.");
  }
  const chainHex = (await provider.request({ method: "eth_chainId" })) as string;
  const accounts = (await provider.request({ method: "eth_accounts" })) as string[];
  const latest = read();
  if (
    latest.provider !== provider ||
    !latest.account ||
    !sameAddress(latest.account, account) ||
    Number(BigInt(chainHex)) !== chainId ||
    !accounts.some((a) => sameAddress(a, account))
  ) {
    throw new Error("Wallet or network changed. Reconnect and review again.");
  }
  return { account, provider };
}
