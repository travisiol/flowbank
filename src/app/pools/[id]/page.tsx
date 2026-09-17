import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DappBoundary } from "@/components/dapp/dapp-boundary";
import { loadManifest } from "@/lib/server/manifest";
import { site } from "@/lib/site";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const market = (await loadManifest()).markets.find((m) => m.id === id);
  return {
    title: market ? `${site.ticker} / ${market.symbol} | ${site.name}` : `Liquidity pool | ${site.name}`,
    description: "Pool status, wallet-owned liquidity and fee claims on Robinhood Chain.",
  };
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  const manifest = await loadManifest();
  if (!manifest.markets.some((m) => m.id === id)) notFound();
  return <DappBoundary view="pool" pool={id} />;
}
