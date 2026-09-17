import Link from "next/link";

export default function NotFound() {
  return (
    <main className="site-shell dapp-main">
      <div className="empty-state">
        <span className="section-kicker">404 · OUTSIDE THE NEIGHBORHOOD</span>
        <h1 className="text-3xl my-6">This page doesn’t exist.</h1>
        <p>The pool or article may have moved. Head back to explore the network.</p>
        <Link className="button primary" href="/app">
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
