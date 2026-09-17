import { parseAbi } from "viem";

export {
  configAbi,
  stakingAbi as stakingFullAbi,
  holdersAbi,
  liquidityAbi,
  feeAdapterAbi,
  launchAdapterAbi,
} from "./protocol";

export const erc20Abi = parseAbi([
  "function balanceOf(address) view returns(uint256)",
  "function allowance(address,address) view returns(uint256)",
  "function approve(address,uint256) returns(bool)",
  "function decimals() view returns(uint8)",
  "function symbol() view returns(string)",
  "function totalSupply() view returns(uint256)",
]);

export const stakingAbi = parseAbi([
  "function stake(uint256)",
  "function withdraw(uint256)",
  "function claim()",
  "function balanceOf(address) view returns(uint256)",
  "function earned(address) view returns(uint256)",
  "function totalStaked() view returns(uint256)",
  "function totalFunded() view returns(uint256)",
]);

export const poolAbi = parseAbi([
  "function slot0() view returns(uint160 sqrtPriceX96,int24 tick,uint16,uint16,uint16,uint8,bool)",
  "function liquidity() view returns(uint128)",
  "function token0() view returns(address)",
  "function token1() view returns(address)",
  "function fee() view returns(uint24)",
]);

export const positionManagerAbi = parseAbi([
  "function balanceOf(address) view returns(uint256)",
  "function tokenOfOwnerByIndex(address,uint256) view returns(uint256)",
  "function ownerOf(uint256) view returns(address)",
  "function positions(uint256) view returns(uint96 nonce,address operator,address token0,address token1,uint24 fee,int24 tickLower,int24 tickUpper,uint128 liquidity,uint256 feeGrowthInside0LastX128,uint256 feeGrowthInside1LastX128,uint128 tokensOwed0,uint128 tokensOwed1)",
  "function mint((address token0,address token1,uint24 fee,int24 tickLower,int24 tickUpper,uint256 amount0Desired,uint256 amount1Desired,uint256 amount0Min,uint256 amount1Min,address recipient,uint256 deadline)) payable returns(uint256 tokenId,uint128 liquidity,uint256 amount0,uint256 amount1)",
  "function decreaseLiquidity((uint256 tokenId,uint128 liquidity,uint256 amount0Min,uint256 amount1Min,uint256 deadline)) payable returns(uint256 amount0,uint256 amount1)",
  "function collect((uint256 tokenId,address recipient,uint128 amount0Max,uint128 amount1Max)) payable returns(uint256 amount0,uint256 amount1)",
  "function multicall(bytes[]) payable returns(bytes[])",
]);

export const factoryAbi = parseAbi([
  "function getPool(address,address,uint24) view returns(address)",
]);

export const quoterAbi = parseAbi([
  "function quoteExactInput(bytes path,uint256 amountIn) returns(uint256 amountOut,uint160[] sqrtPriceX96AfterList,uint32[] initializedTicksCrossedList,uint256 gasEstimate)",
  "function quoteExactInputSingle((address tokenIn,address tokenOut,uint256 amountIn,uint24 fee,uint160 sqrtPriceLimitX96)) returns(uint256 amountOut,uint160 sqrtPriceX96After,uint32 initializedTicksCrossed,uint256 gasEstimate)",
]);

export const swapRouterAbi = parseAbi([
  "function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96)) payable returns(uint256 amountOut)",
  "function exactInput((bytes path,address recipient,uint256 amountIn,uint256 amountOutMinimum)) payable returns(uint256 amountOut)",
  "function unwrapWETH9(uint256 amountMinimum,address recipient) payable",
  "function refundETH() payable",
  "function multicall(bytes[] data) payable returns(bytes[] results)",
]);

export const curveAbi = parseAbi([
  "function getReserves() view returns(uint256 quoteReserve,uint256 tokenReserve)",
  "function realQuoteReserve() view returns(uint256)",
  "function graduationThreshold() view returns(uint256)",
  "function graduated() view returns(bool)",
  "function quoteFeeBalance() view returns(uint256)",
  "function creatorTaxBps() view returns(uint16)",
  "function feeBps() view returns(uint16)",
]);
