import type { Address, Hex } from "viem";

/** One registered market: the token paired with FLOW and its V3 pool. */
export type Market = {
  id: string;
  symbol: string;
  asset: Address;
  decimals: number;
  fee: number;
  pool: Address;
  token0: Address;
  token1: Address;
  tickLower: number;
  tickUpper: number;
  enabled: boolean;
};

/** The deployment manifest served by /api/launch. */
export type LaunchManifest = {
  version: number;
  phase: "active" | "prelaunch";
  chainId: number;
  deploymentBlock: string;
  token: Address;
  tokenDecimals: number;
  registry: Address;
  staking: Address;
  holders: Address;
  liquidity: Address;
  feeRouter: Address;
  feeAdapter: Address;
  launchAdapter: Address;
  positionManager: Address;
  factory: Address;
  rewardToken: Address;
  rewardDecimals: number;
  markets: Market[];
  codeHashes?: Record<string, Hex>;
  curve?: Address;
  launchTickSpacing?: number;
  launchPoolId?: Hex;
  tokenDeploymentBlock?: string;
  activatedAt?: string;
  active?: boolean;
};

export type PoolSnapshot = {
  id: string;
  symbol: string;
  pool: Address;
  fee: number;
  enabled: boolean;
  reserveAmount: number;
  assetAmount: number;
  tvlUsd: number | null;
  protocolTvlUsd: number | null;
  communityTvlUsd: number | null;
};

export type PoolsResponse = {
  phase: "active" | "prelaunch";
  pools: PoolSnapshot[];
  totalTvlUsd: number;
};

export type LaunchpadStatus = {
  token: Address;
  graduated: boolean;
  curveEth: string;
  thresholdEth: string;
  priceEth: string | null;
  priceUsd: string | null;
  marketCapUsd: string | null;
  feesEarnedEth: string;
  feesEarnedUsd: string;
  initialPool: { address: Address; liquidityUsd: string } | null;
};

export type ProtocolStatus = {
  phase: "active" | "prelaunch";
  poolCount: number;
  rewardsFunded: string | null;
  rewardDecimals: number;
  block: string;
};

export type SwapToken = {
  symbol: string;
  name: string;
  address: Address;
  decimals: number;
  native?: boolean;
  tradeEnabled: boolean;
};

export type SwapConfig = {
  chainId: number;
  tokens: SwapToken[];
  router: Address;
  quoter: Address;
  factory: Address;
  active: boolean;
  flowbankPools: Address[];
  aggregator: "configured" | "not-configured";
};

export type RoutePool = {
  token0: Address;
  token1: Address;
  fee: number;
  pool: Address;
  flowbank: boolean;
};

export type SwapRoute = {
  id: string;
  source: "v3" | "0x";
  label: string;
  symbols: string[];
  path: Hex;
  pools: RoutePool[];
  amountOut: string;
  minimumOut: string;
  gasWei: string | null;
  gasOutput: string | null;
  netOut: string | null;
  impactBps: number | null;
  executable: boolean;
};

export type SwapQuote = {
  id: string;
  tokenIn: SwapToken;
  tokenOut: SwapToken;
  amountIn: string;
  expiresAt: number;
  request: { from: string; to: string; amount: string; slippageBps: number; account: Address | null };
  block: string;
  ranking: "net" | "output";
  routes: SwapRoute[];
  warnings: string[];
};

export type PreparedSwap = {
  quoteId: string;
  routeId: string;
  transaction: {
    to: Address;
    data: Hex;
    value: string;
    spender: Address | null;
    chainId: number;
    amountIn: string;
    minimumOut: string;
    expiresAt: number;
  };
};

export type HolderClaim = { epoch: number; amount: string; proof: Hex[] };
export type RewardsResponse = { claims: HolderClaim[]; nextCursor: number | null };
