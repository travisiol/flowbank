// Every brand string on the site derives from this file. Renaming the
// project means editing here, the env prefix and public/brand/.

export const site = {
  // Placeholder name — not final
  name: "Flowbank",
  nameUpper: "FLOWBANK",
  ticker: "FLOW",
  tagline: "Liquidity grows. Value flows.",
  description:
    "A proposed protocol-owned liquidity network on Robinhood Chain. Explore the 3% creator fee model, stock token pools, and community rewards.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://flowbank.xyz",
  // Placeholder handle — the account does not exist yet.
  xHandle: "@FlowbankOnRH",
  xUrl: "https://x.com/FlowbankOnRH",
  brandImage: "/brand/flowbank.png",
  brandImageWidth: 1323,
  brandImageHeight: 1189,
  footerLine: "Independent. Built for shared growth.",
  copyright: "© 2026 Flowbank",
  docsUpdated: "Launch preparation · Updated 11 Sep 2026",
} as const;

export const chain = {
  id: 4663,
  name: "Robinhood Chain",
  explorer: "https://robin.etherscan.io",
  testnetExplorer: "https://explorer.testnet.chain.robinhood.com",
} as const;

export const external = {
  robinhoodStockTokens: "https://docs.robinhood.com/chain/building-with-stock-tokens/",
  degenToken: (token: string) => `https://degen.zone/token/${token.toLowerCase()}`,
} as const;

export const explorerTx = (chainId: number, hash: string) =>
  `https://${chainId === chain.id ? "robin.etherscan.io" : "explorer.testnet.chain.robinhood.com"}/tx/${hash}`;

export const explorerAddress = (address: string) => `${chain.explorer}/address/${address}`;
