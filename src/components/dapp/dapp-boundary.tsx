"use client";

import { LiveView } from "@/components/dapp/live-view";
import { PrelaunchView, type DappView } from "@/components/dapp/prelaunch-view";
import { useLaunch } from "@/components/launch-provider";
import { useWallet } from "@/components/wallet-provider";

/**
 * Picks the screen for a dapp route from the deployment manifest: the live
 * view once the protocol is active, the pre-launch view before, and a
 * retry screen when /api/launch itself is unreachable.
 */
export function DappBoundary({ view, pool }: { view: DappView; pool?: string }) {
  const { launch, error, loading } = useLaunch();
  const wallet = useWallet();

  if (error) {
    return (
      <main className="site-shell dapp-main">
        <h1>Account data unavailable</h1>
        <p role="alert">{error}</p>
        <button className="button secondary" onClick={() => location.reload()}>
          Retry
        </button>
      </main>
    );
  }

  if (launch?.phase === "active") {
    return (
      <LiveView
        key={`${launch.chainId}:${launch.token}:${wallet.account}:${wallet.chainId}`}
        manifest={launch}
        view={view}
        poolId={pool}
      />
    );
  }

  return (
    <>
      <PrelaunchView view={view} />
      {loading && (
        <span className="sr-only">
          <output>Checking launch status…</output>
        </span>
      )}
    </>
  );
}
