import { site } from "./site";

/**
 * The approved liquidity policy. Targets apply to new protocol liquidity
 * capital; they are settings, not balances. The live allocation shown once
 * pools exist is read from the chain instead (see AllocationTargets).
 */
export const liquidityPolicy = {
  version: 1,
  chainId: 4663,
  selectionApproved: true,
  approvedAt: "2026-09-11",
  allocationBasis: "New protocol liquidity capital, funding both sides of each pool",
  stages: {
    initial: { symbols: ["USDG", "SPY"] },
    growth: { symbols: ["USDG", "SPY", "NVDA"] },
    full: { symbols: ["USDG", "SPY", "NVDA", "AAPL"] },
  },
  progression: {
    automatic: false,
    requires: [
      "Verified acquisition and exit quotes at the intended trade size",
      "Approved seed and daily spending budgets",
      "Asset eligibility review and governance allowlist",
      "Observed external trading demand before expansion",
    ],
    minimumSeedUsd: null,
    minimumExternalVolumeUsd: null,
  },
  markets: [
    {
      symbol: "USDG",
      name: "Global Dollar",
      asset: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
      decimals: 6,
      fee: 3000,
      quoteFee: 3000,
      targetBps: 5000,
    },
    {
      symbol: "SPY",
      name: "S&P 500 ETF token",
      asset: "0x117cc2133c37B721F49dE2A7a74833232B3B4C0C",
      decimals: 18,
      fee: 3000,
      quoteFee: 500,
      targetBps: 2500,
    },
    {
      symbol: "NVDA",
      name: "NVIDIA token",
      asset: "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC",
      decimals: 18,
      fee: 3000,
      quoteFee: 500,
      targetBps: 1500,
    },
    {
      symbol: "AAPL",
      name: "Apple token",
      asset: "0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9",
      decimals: 18,
      fee: 3000,
      quoteFee: 500,
      targetBps: 1000,
    },
  ],
} as const;

export const allocationTargets = liquidityPolicy.markets.map((m) => ({
  symbol: m.symbol,
  percent: m.targetBps / 100,
}));

const T = site.ticker;

export const rolloutSteps = [
  {
    step: "01",
    title: `ETH / ${T}`,
    label: "Token launch · Degen",
    description: `The launchpad creates the native trading pool. Eligible trades generate the creator fees that fund ${site.name}.`,
  },
  {
    step: "02",
    title: `${T} / USDG`,
    label: "Foundation · planned",
    description: "Activation first seeds the Global Dollar market. It also provides the route used to fund USDG rewards.",
  },
  {
    step: "03",
    title: `${T} / SPY`,
    label: "First stock market · planned",
    description:
      "The initial rollout then seeds the S&P 500 ETF-token pool, subject to verified routes and a funded seed budget.",
  },
  {
    step: "04",
    title: `${T} / NVDA`,
    label: "Expansion · gated",
    description: "NVIDIA follows when funding and observed external trading demand support another market.",
  },
  {
    step: "05",
    title: `${T} / AAPL`,
    label: "Expansion · gated",
    description:
      "Apple completes the selected rollout after its route, spending limits and activation conditions are verified.",
  },
];
