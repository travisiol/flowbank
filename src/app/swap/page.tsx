import type { Metadata } from "next";

import { SwapPage } from "@/components/swap/swap-page";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: `Swap | ${site.name}`,
  description: `Compare live swap quotes across direct markets and ${site.name} liquidity pools on Robinhood Chain.`,
};

export default function Page() {
  return <SwapPage />;
}
