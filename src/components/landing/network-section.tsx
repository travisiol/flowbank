"use client";

import Link from "next/link";
import { ArrowUpRight, Gift, Layers, Network, ShieldCheck } from "lucide-react";
import { formatUnits } from "viem";

import { AllocationTargets } from "@/components/allocation-targets";
import { useLaunchpad, useProtocol } from "@/components/data-hooks";
import { useLaunch } from "@/components/launch-provider";
import { rolloutSteps } from "@/lib/rollout";
import { site } from "@/lib/site";

const fromUnits = (raw: string, decimals: number) => formatUnits(BigInt(raw), decimals);

/** “The network” heading, the four status metrics and the pool grid. */
export function NetworkSection() {
  const { launch, error } = useLaunch();
  const launchpad = useLaunchpad();
  const live = launch?.phase === "active";
  const protocol = useProtocol(live);

  return (
    <>
      <div className="overview-heading">
        <div>
          <span className="section-kicker">THE NETWORK</span>
          <h2>Every pool has a purpose.</h2>
        </div>
        <span className="outline-chip">{error ? "STATUS UNAVAILABLE" : live ? "ONCHAIN NETWORK" : "PREPARING FOR LAUNCH"}</span>
      </div>

      <section className="metrics" aria-label="Protocol status">
        <article>
          <div>
            <Layers size={17} /> {live ? "Registered pools" : "Live pools"}
          </div>
          <strong>{live ? (protocol?.poolCount ?? "—") : launchpad?.initialPool ? 1 : (protocol?.poolCount ?? "—")}</strong>
          <small>
            {live
              ? `Markets registered with ${site.name}`
              : launchpad?.initialPool
                ? `Initial ${site.ticker} / USDG market, funded from creator fees`
                : "The first market opens after activation"}
          </small>
        </article>
        <article>
          <div>
            <Gift size={17} /> Rewards funded
          </div>
          <strong>
            {protocol?.rewardsFunded == null ? "—" : fromUnits(protocol.rewardsFunded, protocol.rewardDecimals ?? 6)}
            <span>USDG</span>
          </strong>
          <small>Lifetime funding of holder and staking contracts</small>
        </article>
        <article>
          <div>
            <ShieldCheck size={17} /> Creator fee split
          </div>
          <strong>
            2<span>:</span>1
          </strong>
          <small>Protocol liquidity to team treasury</small>
        </article>
        <article>
          <div>
            <Network size={17} /> Network
          </div>
          <strong className="network-name">Robinhood</strong>
          <small>Chain ID 4663 · Gas paid in ETH</small>
        </article>
      </section>

      <section className="pools-section" id="pools">
        <div className="section-title">
          <div>
            <h2>{live ? `${site.name} pools` : "The pool rollout"}</h2>
            <p>{live ? "View verified markets and manage your own liquidity." : "A clear first market, followed by deliberate expansion."}</p>
          </div>
          <Link className="text-link" href="/pools">
            Explore pools <ArrowUpRight size={16} />
          </Link>
        </div>
        {live ? (
          <div className="rollout-grid">
            {launch.markets.map((market) => (
              <Link key={market.id} className="panel" href={`/pools/${market.id}`}>
                <span className="section-kicker">{market.fee / 10_000}% SWAP FEE</span>
                <h3>
                  {site.ticker} / {market.symbol}
                </h3>
                <p>{market.pool}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rollout-grid">
            {rolloutSteps.map((step) => (
              <article key={step.step} className="panel">
                <span className="section-kicker">
                  {step.step} · {step.label}
                </span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        )}
        <AllocationTargets />
      </section>
    </>
  );
}
