"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Wallet } from "lucide-react";

import { useLaunch } from "@/components/launch-provider";
import { useWallet } from "@/components/wallet-provider";
import { site } from "@/lib/site";

export function BrandMark({ small = false }: { small?: boolean }) {
  return (
    <span className={`brand-mark ${small ? "small" : ""}`} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element -- fixed brand asset, sized by CSS */}
      <img src={site.brandImage} alt="" width={site.brandImageWidth} height={site.brandImageHeight} />
    </span>
  );
}

export function ConnectButton({ className = "header-button" }: { className?: string }) {
  const { account, connecting, open } = useWallet();
  return (
    <button className={className} onClick={() => void open()} aria-label={account ? "Open wallet account" : "Connect wallet"}>
      <Wallet size={16} />
      {account ? `${account.slice(0, 6)}…${account.slice(-4)}` : connecting ? "Connecting…" : "Connect wallet"}
    </button>
  );
}

const mainNav: Array<[string, string]> = [
  ["/", "Overview"],
  ["/pools", "Pools"],
  ["/swap", "Swap"],
  ["/staking", "Staking"],
  ["/rewards", "Rewards"],
  ["/docs", "Docs"],
];

export function SiteHeader() {
  const pathname = usePathname();
  const { error } = useWallet();
  return (
    <div className="site-shell">
      <header className="site-header dapp-site-header">
        <Link href="/" className="brand" aria-label={`${site.name} home`}>
          <BrandMark />
          {site.name}
        </Link>
        <nav aria-label="Main navigation">
          {mainNav.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className={pathname === href || (href !== "/" && pathname.startsWith(href + "/")) ? "active" : ""}
            >
              {label}
            </Link>
          ))}
        </nav>
        <ConnectButton />
      </header>
      {error && (
        <p role="alert" className="inline-error wallet-error">
          {error}
        </p>
      )}
    </div>
  );
}

export function SiteFooter() {
  const { launch } = useLaunch();
  return (
    <div className="site-shell">
      <footer>
        <Link href="/" className="brand">
          <BrandMark />
          {site.name}
        </Link>
        <span>{site.footerLine}</span>
        <Link href="/docs">
          Documentation <ArrowUpRight size={14} />
        </Link>
        <a href={site.xUrl} target="_blank" rel="noopener noreferrer">
          {site.xHandle} <ArrowUpRight size={14} />
        </a>
        <span>
          {site.copyright}
          {launch?.phase === "active" ? "" : " · Pre-launch"}
        </span>
      </footer>
    </div>
  );
}

const dappNav: Array<[string, string]> = [
  ["/app", "Dashboard"],
  ["/pools", "Explore pools"],
  ["/swap", "Swap"],
  ["/positions", "My positions"],
  ["/staking", "Staking"],
  ["/rewards", "Rewards"],
];

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav className="app-nav" aria-label="Dapp navigation">
      {dappNav.map(([href, label]) => (
        <a
          key={href}
          href={href}
          aria-current={pathname === href || (href === "/pools" && pathname.startsWith("/pools/")) ? "page" : undefined}
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
