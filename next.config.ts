import type { NextConfig } from "next";

// @coinbase/cdp-sdk (a dependency of the AppKit ethers adapter) imports the
// optional @x402 payment packages, which are not installed. Alias them to an
// inert CommonJS stub so the bundle resolves; nothing here ever calls them.
const x402Stub = "./src/lib/empty.js";
const x402Aliases = Object.fromEntries(
  ["@x402/core", "@x402/core/client", "@x402/evm", "@x402/evm/exact/client", "@x402/evm/upto/client", "@x402/svm", "@x402/svm/exact/client"].map(
    (name) => [name, x402Stub],
  ),
);

const nextConfig: NextConfig = {
  // The site is served by Node so the /api/* route handlers (RPC proxy,
  // pool reads, swap quotes) run next to the pages. No static export.
  reactStrictMode: true,
  turbopack: { resolveAlias: x402Aliases },
};

export default nextConfig;
