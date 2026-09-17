import type { Metadata } from "next";

import { DocsIndex } from "@/components/docs/docs-index";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: `Documentation | ${site.name}`,
  description: `Detailed guides to ${site.name} liquidity, direct LP deposits, fee claims, staking, holder rewards and the proposed protocol architecture.`,
};

export default function Page() {
  return <DocsIndex />;
}
