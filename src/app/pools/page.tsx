import type { Metadata } from "next";

import { DappBoundary } from "@/components/dapp/dapp-boundary";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: `Explore pools | ${site.name}`,
  description: `Verified ${site.name} markets and the planned pool rollout.`,
};

export default function Page() {
  return <DappBoundary view="pools" />;
}
