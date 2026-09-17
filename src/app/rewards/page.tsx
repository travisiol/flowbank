import type { Metadata } from "next";

import { DappBoundary } from "@/components/dapp/dapp-boundary";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: `Claim rewards | ${site.name}`,
  description: "View and claim your funded holder, staking and personal LP rewards.",
};

export default function Page() {
  return <DappBoundary view="rewards" />;
}
