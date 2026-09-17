// CommonJS stub for optional @x402/* payment modules that @coinbase/cdp-sdk
// (pulled in by the AppKit ethers adapter) imports but this site never calls.
// CommonJS on purpose: Turbopack cannot statically verify its exports, so the
// named imports resolve at build time and simply return undefined.
module.exports = new Proxy({}, { get: () => undefined });
