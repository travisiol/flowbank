"use client";

import { usePools } from "@/components/data-hooks";
import { allocationTargets } from "@/lib/rollout";
import { site } from "@/lib/site";

/**
 * Approved targets before pools exist; once /api/pools reports protocol
 * liquidity, each pool’s live share of it replaces the policy numbers.
 */
export function AllocationTargets() {
  const priced = usePools().filter((pool) => pool.tvlUsd !== null);
  const total = priced.reduce((sum, pool) => sum + (pool.tvlUsd ?? 0), 0);
  const rows = total
    ? priced
        .map((pool) => ({ symbol: pool.symbol, percent: Math.round(((pool.tvlUsd ?? 0) / total) * 100) }))
        .sort((a, b) => b.percent - a.percent)
    : allocationTargets;
  const live = !!total;

  return (
    <section className="panel allocation-targets" aria-label={live ? "Live liquidity allocation" : "Approved liquidity allocation"}>
      <span className="section-kicker">
        {live ? "LIVE ALLOCATION · SHARE OF PROTOCOL LIQUIDITY" : "APPROVED TARGET · AS POOLS OPEN"}
      </span>
      <h3>Grow with a clear allocation.</h3>
      <div className="allocation-target-grid">
        {rows.map(({ symbol, percent }) => (
          <div key={symbol}>
            <span>
              {site.ticker} / {symbol}
            </span>
            <strong>{percent}%</strong>
          </div>
        ))}
      </div>
      <p>
        {live
          ? "Each share is that pool’s portion of protocol-owned liquidity right now, read from the chain. New creator fees are directed to whichever pools sit furthest below their target, so these shares move as pools fill and prices change."
          : "Targets apply to new protocol liquidity capital and fund both sides of each pool. Pool balances will vary with prices. These are allocation settings, not live balances or returns."}
      </p>
    </section>
  );
}
