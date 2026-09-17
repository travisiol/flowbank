import type { Metadata } from "next";

import { DappBoundary } from "@/components/dapp/dapp-boundary";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: `Dashboard | ${site.name}`,
  description: `Your wallet, liquidity positions and ${site.name} rewards.`,
};

export default function Page() {
  return <DappBoundary view="dashboard" />;
}
