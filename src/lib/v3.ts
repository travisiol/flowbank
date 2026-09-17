// Uniswap V3 maths in BigInt — the subset the deposit quote needs:
// tick → sqrtPrice, liquidity from one side, the paired amount for a
// full-range position, and the slippage floor. Ported from the V3 core
// TickMath / LiquidityAmounts libraries.

const Q96 = 1n << 96n;
const MAX_UINT256 = (1n << 256n) - 1n;
const MIN_TICK = -887272;
const MAX_TICK = 887272;

const TICK_FACTORS = [
  340265354078544963557816517032075149313n,
  340248342086729790484326174814286782778n,
  340214320654664324051920982716015181260n,
  340146287995602323631171512101879684304n,
  340010263488231146823593991679159461444n,
  339738377640345403697157401104375502016n,
  339195258003219555707034227454543997025n,
  338111622100601834656805679988414885971n,
  335954724994790223023589805789778977700n,
  331682121138379247127172139078559817300n,
  323299236684853023288211250268160618739n,
  307163716377032989948697243942600083929n,
  277268403626896220162999269216087595045n,
  225923453940442621947126027127485391333n,
  149997214084966997727330242082538205943n,
  66119101136024775622716233608466517926n,
  12847376061809297530290974190478138313n,
  485053260817066172746253684029974020n,
  691415978906521570653435304214168n,
  1404880482679654955896180642n,
];

export function getSqrtRatioAtTick(tick: number): bigint {
  if (!Number.isInteger(tick)) throw new Error(`Tick must be an integer: ${tick}`);
  if (tick < MIN_TICK || tick > MAX_TICK) {
    throw new Error(`Tick ${tick} is outside V3's range [${MIN_TICK}, ${MAX_TICK}].`);
  }
  const abs = Math.abs(tick);
  let ratio = 1n << 128n;
  for (const [i, factor] of TICK_FACTORS.entries()) {
    if (abs & (1 << i)) ratio = i === 0 ? factor : (ratio * factor) >> 128n;
  }
  if (tick > 0) ratio = MAX_UINT256 / ratio;
  return (ratio >> 32n) + (ratio % (1n << 32n) === 0n ? 0n : 1n);
}

function sorted(a: bigint, b: bigint): [bigint, bigint] {
  return a > b ? [b, a] : [a, b];
}

export function liquidityForAmount0(sqrtA: bigint, sqrtB: bigint, amount0: bigint): bigint {
  const [lo, hi] = sorted(sqrtA, sqrtB);
  if (hi === lo) throw new Error("An empty tick range supports no liquidity.");
  return (amount0 * ((lo * hi) / Q96)) / (hi - lo);
}

export function liquidityForAmount1(sqrtA: bigint, sqrtB: bigint, amount1: bigint): bigint {
  const [lo, hi] = sorted(sqrtA, sqrtB);
  if (hi === lo) throw new Error("An empty tick range supports no liquidity.");
  return (amount1 * Q96) / (hi - lo);
}

export function amount0ForLiquidity(sqrtA: bigint, sqrtB: bigint, liquidity: bigint): bigint {
  const [lo, hi] = sorted(sqrtA, sqrtB);
  if (lo <= 0n) throw new Error("Sqrt price must be positive.");
  return ((liquidity << 96n) * (hi - lo)) / hi / lo;
}

export function amount1ForLiquidity(sqrtA: bigint, sqrtB: bigint, liquidity: bigint): bigint {
  const [lo, hi] = sorted(sqrtA, sqrtB);
  return (liquidity * (hi - lo)) / Q96;
}

/** Token amounts currently backing a position. */
export function amountsForLiquidity(sqrtCurrent: bigint, sqrtA: bigint, sqrtB: bigint, liquidity: bigint) {
  const [lo, hi] = sorted(sqrtA, sqrtB);
  if (sqrtCurrent <= lo) return { amount0: amount0ForLiquidity(lo, hi, liquidity), amount1: 0n };
  if (sqrtCurrent >= hi) return { amount0: 0n, amount1: amount1ForLiquidity(lo, hi, liquidity) };
  return {
    amount0: amount0ForLiquidity(sqrtCurrent, hi, liquidity),
    amount1: amount1ForLiquidity(lo, sqrtCurrent, liquidity),
  };
}

/** Paired token1 for a given token0 deposit, or null when the price is out of range. */
export function pairedAmount1(sqrtCurrent: bigint, sqrtLower: bigint, sqrtUpper: bigint, amount0: bigint) {
  if (sqrtCurrent <= sqrtLower || sqrtCurrent >= sqrtUpper) return null;
  return amount1ForLiquidity(sqrtLower, sqrtCurrent, liquidityForAmount0(sqrtCurrent, sqrtUpper, amount0));
}

/** Paired token0 for a given token1 deposit, or null when the price is out of range. */
export function pairedAmount0(sqrtCurrent: bigint, sqrtLower: bigint, sqrtUpper: bigint, amount1: bigint) {
  if (sqrtCurrent <= sqrtLower || sqrtCurrent >= sqrtUpper) return null;
  return amount0ForLiquidity(sqrtCurrent, sqrtUpper, liquidityForAmount1(sqrtLower, sqrtCurrent, amount1));
}

export function applySlippage(amount: bigint, bps: number): bigint {
  if (!Number.isInteger(bps) || bps < 0 || bps > 10_000) throw new Error(`Slippage must be 0-10000 bps: ${bps}`);
  return (amount * BigInt(10_000 - bps)) / 10_000n;
}

/** Spot price of token1 per token0 from slot0’s sqrtPriceX96, as a float. */
export function priceFromSqrt(sqrtPriceX96: bigint, decimals0: number, decimals1: number): number {
  const ratio = Number(sqrtPriceX96) / Number(Q96);
  return ratio * ratio * 10 ** (decimals0 - decimals1);
}
