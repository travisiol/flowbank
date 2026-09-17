import { formatUnits } from "viem";

/** Grouped integer part, up to four decimals, trailing zeros trimmed. */
export function formatToken(value: bigint, decimals: number): string {
  const [whole, fraction = ""] = formatUnits(value, decimals).split(".");
  const grouped = BigInt(whole).toLocaleString("en-US");
  const trimmed = fraction.slice(0, 4).replace(/0+$/, "");
  return trimmed ? `${grouped}.${trimmed}` : grouped;
}

export const formatExact = (value: bigint, decimals: number) => formatUnits(value, decimals);

export const formatUsd = (value: number) =>
  value >= 1e6 ? `$${(value / 1e6).toFixed(2)}M` : value >= 1e3 ? `$${(value / 1e3).toFixed(1)}K` : `$${value.toFixed(0)}`;

export const shortAddress = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

export const formatSignificant = (raw: string, decimals: number) =>
  Number(formatUnits(BigInt(raw), decimals)).toLocaleString("en-US", { maximumSignificantDigits: 9 });
