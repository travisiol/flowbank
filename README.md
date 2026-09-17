# FLOWBANK

Liquidity grows. Value flows.

A protocol-owned liquidity network on Robinhood Chain (chain id 4663) built
around one token, **$FLOW**. Trading fees on the launch venue fund
protocol-owned V3 pools two-to-one against a team treasury; the LP fees those
pools earn fund holder and staking rewards in USDG.

The site is a 1:1 rebuild of [reservoir.technology](https://reservoir.technology)
under a new name: same 25 routes, same stylesheet, same server layer, only the
brand strings changed. It is not affiliated with Reservoir or Robinhood.

## Routes

| Route | What it is |
| --- | --- |
| `/` | Landing: hero, live protocol metrics, pool grid, mechanism, rewards, readiness |
| `/app` | Dapp dashboard (balances, pools, stake, positions, claims) |
| `/pools`, `/pools/[id]` | Registered markets and one pool with deposit quote + contracts |
| `/swap` | Route comparison and protected swap through the V3 router |
| `/positions`, `/staking`, `/rewards` | Wallet-owned LP NFTs, staking, holder + staking claims |
| `/docs`, `/docs/[slug]` | Documentation index and 13 articles |
| `/api/*` | See below |

Every dapp route has two screens: the pre-launch view (from the SSR HTML) and
the live view once `/api/launch` reports `phase: "active"`.

## Server API

All chain reads happen server-side; the browser only talks to this origin.

| Endpoint | Purpose |
| --- | --- |
| `POST /api/rpc` | Read-only JSON-RPC relay (allowlisted methods, batches OK) |
| `GET /api/launch` | Deployment manifest (`config/launch.json`) |
| `GET /api/protocol` | Registered pool count, lifetime USDG funded, confirmed block |
| `GET /api/pools` | Pool balances priced in USD, protocol vs community share |
| `GET /api/launchpad` | Bonding-curve status and creator fees on the Degen venue |
| `GET /api/rewards/:account?cursor=` | Unclaimed holder-reward proofs (from `data/rewards/<epoch>.json`) |
| `GET /api/swap/config`, `/tokens`, `/pools` | Swap configuration, public token list, public pool feed |
| `GET /api/swap/quote?from&to&amount&slippageBps&account` | V3 quotes: direct pools + one intermediate, gas-adjusted ranking, 45 s expiry |
| `POST /api/swap/prepare` | Router calldata (`multicall(deadline, [exactInput, unwrapWETH9?])`) for a quoted route |

## Run it

```bash
cp .env.example .env.local
npm install
npm run dev        # http://localhost:3844
```

`npm run build && npm start` for production. The site needs a Node runtime
(route handlers); it is not a static export.

## Before this goes live

The manifest in `config/launch.json` and a few constants still point at the
deployment the original site reads. Replace them with the FLOWBANK deployment:

1. `config/launch.json` — `token`, `registry`, `staking`, `holders`,
   `liquidity`, `feeRouter`, `feeAdapter`, `launchAdapter`, `curve`,
   `launchPoolId`, `deploymentBlock`, `tokenDeploymentBlock`, `activatedAt`
   and every market `pool`. `positionManager`, `factory` and `rewardToken`
   (USDG) are shared chain infrastructure and stay.
2. `NEXT_PUBLIC_REOWN_PROJECT_ID` — create a project at dashboard.reown.com.
   Without it the header falls back to the injected browser wallet.
3. `NEXT_PUBLIC_SITE_URL` — the real domain (used in metadata, the token list
   and the pool feed).
4. `src/lib/site.ts` — `xHandle` / `xUrl` are placeholders (`@FlowbankOnRH`
   does not exist), and the name itself is marked `Placeholder name`.
5. `public/brand/flowbank.png` — generated from `flowbank.svg`; swap in the
   final mark if one is produced.
6. `data/rewards/` — the reward worker publishes one JSON file per epoch
   here (`{ epoch, claims: { [account]: { amount, proof } } }`). Until it
   does, the Rewards page shows no holder allocations.

The `liquidityPolicy` in `src/lib/rollout.ts` (the 50/25/15/10 targets and
the four base markets) is the approved policy text and is meant to be kept.
