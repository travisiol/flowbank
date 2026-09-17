import type { Metadata } from "next";

import { DappBoundary } from "@/components/dapp/dapp-boundary";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: `Stake ${site.ticker} | ${site.name}`,
  description: `Stake ${site.ticker} and claim funded USDG rewards after activation.`,
};

export default function Page() {
  return <DappBoundary view="staking" />;
}
