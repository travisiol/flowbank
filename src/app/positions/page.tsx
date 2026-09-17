import type { Metadata } from "next";

import { DappBoundary } from "@/components/dapp/dapp-boundary";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: `My positions | ${site.name}`,
  description: "Manage your wallet-owned liquidity positions and personal LP fees.",
};

export default function Page() {
  return <DappBoundary view="positions" />;
}
