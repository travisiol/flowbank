// Loaded on demand by the wallet provider (it pulls ~1 MB of AppKit UI).
// Never imported statically from a page.
import { createAppKit } from "@reown/appkit";
import { defineChain } from "@reown/appkit/networks";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";

import { site } from "./site";

export const robinhood = defineChain({
  id: 4663,
  caipNetworkId: "eip155:4663",
  chainNamespace: "eip155",
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.mainnet.chain.robinhood.com"] } },
  blockExplorers: { default: { name: "Robinhood Explorer", url: "https://robin.etherscan.io" } },
});

const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID;
if (!projectId) throw new Error("NEXT_PUBLIC_REOWN_PROJECT_ID is not set");

export const appKit = createAppKit({
  projectId,
  adapters: [new EthersAdapter()],
  networks: [robinhood],
  defaultNetwork: robinhood,
  metadata: {
    name: site.name,
    description: "Protocol liquidity and community rewards on Robinhood Chain.",
    url: window.location.origin,
    icons: [`${site.url}${site.brandImage}`],
  },
  customRpcUrls: { "eip155:4663": [{ url: "https://rpc.mainnet.chain.robinhood.com" }] },
  themeMode: "light",
  themeVariables: {
    "--w3m-accent": "#00785c",
    "--w3m-border-radius-master": "2px",
    "--w3m-font-family": "Geist, sans-serif",
    "--w3m-z-index": 1000,
  },
  features: {
    analytics: false,
    email: false,
    socials: false,
    swaps: false,
    onramp: false,
    history: false,
    send: false,
    receive: false,
  },
  enableReconnect: true,
  allowUnsupportedChain: false,
});
