// Full-page screenshots of every route with headless Chrome (no GPU needed).
// Usage: node scripts/capture.mjs [baseUrl] [outDir]
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";

const base = process.argv[2] ?? "http://localhost:3844";
const out = process.argv[3] ?? "captures";
const chrome = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
mkdirSync(out, { recursive: true });

const routes = [
  ["home", "/", 1440, 4200],
  ["pools", "/pools", 1440, 2400],
  ["pool-usdg", "/pools/usdg", 1440, 2600],
  ["swap", "/swap", 1440, 1500],
  ["staking", "/staking", 1440, 1800],
  ["rewards", "/rewards", 1440, 1800],
  ["positions", "/positions", 1440, 1500],
  ["app", "/app", 1440, 2400],
  ["docs", "/docs", 1440, 2600],
  ["docs-tokenomics", "/docs/tokenomics", 1440, 2400],
  ["not-found", "/nope", 1440, 900],
  ["home-mobile", "/", 500, 3600],
];

for (const [name, route, width, height] of routes) {
  const file = path.join(out, `${name}.png`);
  const result = spawnSync(
    chrome,
    [
      "--headless=new",
      "--no-first-run",
      `--user-data-dir=${path.join(out, ".profile")}`,
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--ignore-gpu-blocklist",
      "--hide-scrollbars",
      `--window-size=${width},${height}`,
      "--virtual-time-budget=12000",
      `--screenshot=${file}`,
      `${base}${route}`,
    ],
    { stdio: "ignore", timeout: 90_000 },
  );
  console.log(result.status === 0 ? "ok  " : "FAIL", name, route);
}
