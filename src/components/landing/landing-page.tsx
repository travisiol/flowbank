"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ArrowUpRight, Check, Copy, Network } from "lucide-react";

import { NetworkSection } from "@/components/landing/network-section";
import { Sculpture } from "@/components/landing/sculpture";
import manifest from "@/../config/launch.json";
import { external, site } from "@/lib/site";

const TOKEN = manifest.token;
const BUY_URL = external.degenToken(TOKEN);
const T = site.ticker;

const steps = [
  { n: "01", title: "Trade the token", text: "A 3% creator fee on eligible trades starts the cycle." },
  {
    n: "02",
    title: "Grow the pools",
    text: "Two percentage points fund both sides of protocol-owned liquidity. One funds the team.",
  },
  {
    n: "03",
    title: "Put liquidity to work",
    text: `Pools pair ${T} with other tokens. Swaps through those pools generate LP fees.`,
  },
  {
    n: "04",
    title: "Share the pool fees",
    text: "Personal LPs keep their fees. Protocol LP fees fund holder and staking rewards.",
  },
];

export function LandingPage() {
  const [copied, setCopied] = useState(false);

  return (
    <div className="site-shell">
      <main id="overview">
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="status-dot" /> ${T} IS LIVE ON ROBINHOOD CHAIN
            </div>
            <h1>
              Liquidity grows.
              <br />
              <span>Value flows.</span>
            </h1>
            <p>
              One token. A growing network of pools.
              <br />
              Trading fees put to work for the people holding it.
            </p>
            <div className="hero-actions">
              <a className="button primary" href={BUY_URL} target="_blank" rel="noopener noreferrer">
                Buy ${T} <ArrowUpRight size={18} />
              </a>
              <Link className="text-link" href="/pools">
                Explore the pools <ArrowRight size={17} />
              </Link>
              <Link className="text-link" href="/docs">
                Read the docs <ArrowUpRight size={17} />
              </Link>
            </div>
            <div className="chain-line">
              <Network size={15} /> Robinhood Chain <span>•</span>{" "}
              <button
                type="button"
                className="ca-chip"
                onClick={() => {
                  navigator.clipboard?.writeText(TOKEN).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1600);
                  });
                }}
                title={TOKEN}
                aria-label={`Copy the ${T} contract address`}
              >
                CA {TOKEN.slice(0, 6)}…{TOKEN.slice(-4)} {copied ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
          </div>

          <div className="hero-visual" aria-label={`${site.name}: 3% creator fee, with 2% funding liquidity and 1% funding the team.`}>
            <div className="hero-visual-top">
              <span>THE {site.nameUpper} MODEL</span>
              <span className="ticker-badge">${T}</span>
            </div>
            <Sculpture />
            <div className="hero-allocation">
              <div>
                <span className="allocation-dot" />
                <strong>2%</strong>
                <span>
                  Protocol liquidity<small>Build and deepen pools</small>
                </span>
              </div>
              <div>
                <span className="allocation-dot team" />
                <strong>1%</strong>
                <span>
                  Team treasury<small>Keep building</small>
                </span>
              </div>
            </div>
            <div className="hero-visual-foot">
              <span>3% creator fee. Put to work.</span>
              <ArrowUpRight size={16} />
            </div>
          </div>
        </section>

        <NetworkSection />

        <section className="mechanism" id="mechanism">
          <div className="section-title">
            <div>
              <span className="section-kicker">A SIMPLE IDEA, BUILT TO CIRCULATE</span>
              <h2>From a trade to a shared reward.</h2>
            </div>
            <span className="outline-chip">RUNNING ONCHAIN</span>
          </div>
          <div className="steps">
            {steps.map((step) => (
              <article key={step.n}>
                <span>
                  {step.n}
                  <ArrowUpRight size={18} />
                </span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
          <p className="mechanism-note">
            The 3% is the creator allocation on the Pons launch venue, where traders pay 4% including the 1% platform fee. It
            applies to that venue, not automatically to every {T} pool. Secondary LP fees are a separate revenue stream.
          </p>
        </section>

        <section className="rewards live-rewards-intro">
          <div>
            <span className="section-kicker">YOUR PART OF THE POOL</span>
            <h2>
              Hold it. Stake it.
              <br />
              Share what it earns.
            </h2>
            <p>
              Personal LPs receive the fees earned by their own liquidity. Protocol-owned LP fees fund the separate holder and
              staking reward contracts.
            </p>
            <Link className="button primary" href="/rewards">
              Explore rewards <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="panel">
            <span className="section-kicker">FUNDED REWARDS</span>
            <h3>Earned first. Distributed next.</h3>
            <p>
              Rewards become claimable only after the corresponding revenue is collected and funded. Holder and staking rewards
              are funded in USDG and split evenly between them.
            </p>
            <Link className="text-link" href="/docs/fee-claims">
              Follow the fee flow <ArrowUpRight size={16} />
            </Link>
          </div>
        </section>

        <section id="launch" className="launch-note">
          <div>
            <span className="status-dot" />
            <strong>Live.</strong> Token launched, contracts deployed, pools funded by creator fees.
          </div>
          <div className="readiness-grid">
            <article>
              <span className="readiness-tag">SUPPORTED IN DOCUMENTATION</span>
              <h3>Robinhood Chain &amp; stock pools</h3>
              <p>Robinhood documents a live EVM chain and stock tokens that can be used in AMM pools.</p>
              <a href={external.robinhoodStockTokens} target="_blank" rel="noreferrer">
                Read Robinhood’s documentation <ArrowUpRight size={14} />
              </a>
            </article>
            <article>
              <span className="readiness-tag">FEES FLOWING</span>
              <h3>Launchpad &amp; fee collection</h3>
              <p>
                {T} launched on Pons with a 3% creator fee. Collected fees are claimed onchain and split two to one, liquidity to
                treasury.
              </p>
              <Link href="/docs/fee-claims">
                Follow the fee flow <ArrowUpRight size={14} />
              </Link>
            </article>
            <article>
              <span className="readiness-tag">DEPLOYED</span>
              <h3>Liquidity &amp; reward vaults</h3>
              <p>
                Liquidity, staking and holder reward contracts are deployed and active on Robinhood Chain, funded automatically
                from claimed creator fees.
              </p>
              <Link href="/docs/architecture">
                Read the architecture <ArrowUpRight size={14} />
              </Link>
            </article>
          </div>
          <p>
            Deposits, staking and claims are open. Stock tokens provide economic exposure rather than ownership of the underlying
            shares; eligibility and jurisdiction restrictions apply. {site.name} is independent of Robinhood.
          </p>
        </section>
      </main>
    </div>
  );
}
