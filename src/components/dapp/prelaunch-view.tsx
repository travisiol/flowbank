"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight, Gift, Layers, LockKeyhole, Wallet } from "lucide-react";

import { AllocationTargets } from "@/components/allocation-targets";
import { useLaunchpad } from "@/components/data-hooks";
import { AppNav, ConnectButton } from "@/components/site-chrome";
import { useWallet } from "@/components/wallet-provider";
import { rolloutSteps } from "@/lib/rollout";
import { chain, explorerAddress, site } from "@/lib/site";

export type DappView = "dashboard" | "pools" | "pool" | "positions" | "staking" | "rewards";

const T = site.ticker;

const headings: Record<DappView, { eyebrow: string; title: string; description: string }> = {
  dashboard: {
    eyebrow: `YOUR ${site.nameUpper}`,
    title: "Your share of the network.",
    description: "Your liquidity, stake and rewards, connected to your own wallet.",
  },
  pools: {
    eyebrow: `THE ${site.nameUpper} NETWORK`,
    title: "Built one pool at a time.",
    description: "Explore the approved market sequence and liquidity allocation targets.",
  },
  pool: {
    eyebrow: "FIRST PLANNED MARKET",
    title: `${T} / USDG`,
    description: "A separate V3 market for protocol liquidity and user-owned LP positions.",
  },
  positions: {
    eyebrow: "YOUR LIQUIDITY",
    title: "Your positions. Your fees.",
    description: "Manage the liquidity positions owned by your wallet.",
  },
  staking: {
    eyebrow: `STAKE WITH ${site.nameUpper}`,
    title: "A stake in what we build.",
    description: `Stake ${T} to earn a share of funded protocol LP revenue.`,
  },
  rewards: {
    eyebrow: "YOUR SHARE OF THE FEES",
    title: "Good things, earned together.",
    description: "Personal LP fees, holder allocations and staking rewards, accounted for separately.",
  },
};

/** What every dapp route shows until the deployment manifest is active. */
export function PrelaunchView({ view }: { view: DappView }) {
  const wallet = useWallet();
  const launchpad = useLaunchpad();
  const heading = headings[view] ?? headings.dashboard;

  return (
    <div className="site-shell">
      <AppNav />
      <main className="dapp-main">
        <div className="live-wallet-row">
          <span className="outline-chip">AWAITING TOKEN LAUNCH</span>
          {wallet.account ? (
            <Link className="subtle-link" target="_blank" rel="noreferrer" href={explorerAddress(wallet.account)}>
              {wallet.account.slice(0, 8)}…{wallet.account.slice(-6)} <ArrowUpRight size={14} />
            </Link>
          ) : (
            <span className="muted">Your wallet. Your assets.</span>
          )}
        </div>
        <div className="dapp-heading">
          <div>
            <span className="section-kicker">{heading.eyebrow}</span>
            <h1>{heading.title}</h1>
            <p>{heading.description}</p>
          </div>
        </div>
        {wallet.account && wallet.chainId !== chain.id && (
          <div className="network-notice">
            <span>Switch to Robinhood Chain to use {site.name}.</span>
            <button className="button secondary" onClick={() => void wallet.switchNetwork()}>
              Switch network
            </button>
          </div>
        )}

        {view === "pools" || view === "pool" ? (
          <>
            <section className="panel launch-market">
              <div className="launch-market-head">
                <div className="launch-market-icon">
                  <Layers size={25} />
                </div>
                <div>
                  <span className="section-kicker">
                    {launchpad?.initialPool ? "LIVE · INITIAL MARKET — DEPOSITS OPEN AT ACTIVATION" : "PLANNED · NOT OPEN FOR DEPOSITS"}
                  </span>
                  <h2>{T} / USDG</h2>
                  <p>Global Dollar · Robinhood Chain</p>
                </div>
              </div>
              <dl className="detail-rows">
                <div>
                  <dt>Swap fee</dt>
                  <dd>0.30%{launchpad?.initialPool ? "" : " planned"}</dd>
                </div>
                <div>
                  <dt>Pool address</dt>
                  <dd>
                    {launchpad?.initialPool ? (
                      <a className="subtle-link" href={explorerAddress(launchpad.initialPool.address)} target="_blank" rel="noopener noreferrer">
                        {launchpad.initialPool.address.slice(0, 8)}…{launchpad.initialPool.address.slice(-6)} <ArrowUpRight size={13} />
                      </a>
                    ) : (
                      "Published after creation"
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Liquidity and trading volume</dt>
                  <dd>
                    {launchpad?.initialPool
                      ? `${launchpad.initialPool.liquidityUsd} initial liquidity, funded from claimed creator fees`
                      : "Available after activation"}
                  </dd>
                </div>
                <div>
                  <dt>Position ownership</dt>
                  <dd>Your wallet owns its LP NFT</dd>
                </div>
              </dl>
              <button className="button primary" disabled>
                Deposits open after activation
              </button>
              <Link className="subtle-link" href="/docs/launch">
                Read the launch sequence <ArrowUpRight size={15} />
              </Link>
            </section>
            <section className="dapp-section">
              <div className="section-title">
                <h2>The pool rollout</h2>
              </div>
              <AllocationTargets />
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
            </section>
          </>
        ) : (
          <>
            <section className="dapp-stats" aria-label="Account data availability">
              {(view === "staking"
                ? [`Available ${T}`, `Staked ${T}`, "Funded USDG rewards"]
                : view === "rewards"
                  ? ["Personal LP fees", "Holder rewards", "Staking rewards"]
                  : ["Your liquidity", `Your staked ${T}`, "Available rewards"]
              ).map((label) => (
                <article key={label} className="dapp-stat">
                  <span>{label}</span>
                  <strong>—</strong>
                  <small>Available after activation</small>
                </article>
              ))}
            </section>
            <section className="panel launch-empty">
              <div className="launch-empty-icon">
                {view === "staking" ? (
                  <LockKeyhole size={27} />
                ) : view === "rewards" ? (
                  <Gift size={27} />
                ) : view === "positions" ? (
                  <Layers size={27} />
                ) : (
                  <Wallet size={27} />
                )}
              </div>
              <span className="section-kicker">{wallet.account ? "WALLET CONNECTED" : "CONNECT WHEN YOU’RE READY"}</span>
              <h2>
                {view === "staking"
                  ? "Staking opens after activation."
                  : view === "rewards"
                    ? "Rewards appear when they are funded."
                    : view === "positions"
                      ? "Your positions will appear here."
                      : "Ready for your wallet."}
              </h2>
              <p>
                {view === "staking"
                  ? "The staking contract and token address will be published before deposits open. Your wallet will approve each transaction."
                  : view === "rewards"
                    ? "Claims will use actual LP balances and funded holder or staking allocations. There are no claimable rewards to display before activation."
                    : view === "positions"
                      ? "After the first pool opens, positions you create will be read directly from the position manager."
                      : `Connect a real wallet now. Balances and transaction actions become available when the verified ${site.name} contracts are activated.`}
              </p>
              {wallet.account ? (
                <Link className="button secondary" href="/docs/launch">
                  View launch status <ArrowUpRight size={16} />
                </Link>
              ) : (
                <ConnectButton className="button primary" />
              )}
            </section>
            {view === "dashboard" && (
              <div className="launch-links">
                <Link className="panel" href="/pools">
                  <Layers size={22} />
                  <div>
                    <h3>Explore the first market</h3>
                    <p>{T} / USDG is the first planned pool.</p>
                  </div>
                  <ArrowRight size={19} />
                </Link>
                <Link className="panel" href="/docs">
                  <Gift size={22} />
                  <div>
                    <h3>Understand the rewards</h3>
                    <p>Follow creator fees, pool income and claims.</p>
                  </div>
                  <ArrowRight size={19} />
                </Link>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
