"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowDownUp, ArrowRight, ArrowUpRight, RefreshCw, Route, ShieldCheck } from "lucide-react";
import { createPublicClient, custom, formatUnits, maxUint256, parseUnits, type Address, type Hex } from "viem";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { AppNav, ConnectButton } from "@/components/site-chrome";
import { useWallet } from "@/components/wallet-provider";
import { erc20Abi } from "@/lib/abi";
import { robinhoodClient, verifyWallet, walletClientFor, type WalletSnapshot } from "@/lib/chain";
import { formatSignificant } from "@/lib/format";
import { chain, site } from "@/lib/site";
import type { PreparedSwap, SwapConfig, SwapQuote } from "@/lib/types";

const CHAIN_ID = chain.id;
const T = site.ticker;

function parseAmount(raw: string, decimals: number): bigint {
  if (raw.length > 80 || !/^\d+(\.\d+)?$/.test(raw) || (raw.split(".")[1]?.length ?? 0) > decimals) {
    throw new Error("Enter a positive amount within the token precision.");
  }
  const value = parseUnits(raw, decimals);
  if (value <= 0n || value > maxUint256) throw new Error("Amount is outside the supported range.");
  return value;
}

const exact = (raw: string, decimals: number) => formatUnits(BigInt(raw), decimals);

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Request unavailable. Please try again.");
  return body as T;
}

/** Remounts the form whenever the wallet changes so no stale quote survives. */
export function SwapPage() {
  const wallet = useWallet();
  return <SwapForm key={wallet.account ? `${wallet.account}:${wallet.chainId}` : "disconnected"} />;
}

function SwapForm() {
  const wallet = useWallet();
  const { account, provider, chainId } = wallet;

  const [config, setConfig] = useState<SwapConfig | null>(null);
  const [fromSymbol, setFromSymbol] = useState("USDG");
  const [toSymbol, setToSymbol] = useState("SPY");
  const [amount, setAmount] = useState("");
  const [slippageBps, setSlippageBps] = useState(50);
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [routeId, setRouteId] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<Hex | null>(null);
  const [now, setNow] = useState(0);
  const generation = useRef(0);
  const snapshot = useRef<WalletSnapshot>({ account, provider });

  useLayoutEffect(() => {
    snapshot.current = { account, provider };
    return () => {
      snapshot.current = { account: null, provider: null };
      generation.current = -1;
    };
  }, [account, provider]);

  const loadConfig = useCallback(async () => {
    try {
      setConfig(await api<SwapConfig>("/api/swap/config"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Configuration unavailable.");
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(loadConfig, 0);
    const timer = setInterval(loadConfig, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [loadConfig]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const tokenIn = config?.tokens.find((t) => t.symbol === fromSymbol);
  const tokenOut = config?.tokens.find((t) => t.symbol === toSymbol);

  useEffect(() => {
    let alive = true;
    if (!account || !provider || chainId !== CHAIN_ID || !tokenIn) return;
    const reader = createPublicClient({ transport: custom(provider) });
    (tokenIn.native
      ? reader.getBalance({ address: account })
      : reader.readContract({ address: tokenIn.address, abi: erc20Abi, functionName: "balanceOf", args: [account] })
    )
      .then((value) => {
        if (alive) setBalance(value.toString());
      })
      .catch(() => {
        if (alive) setBalance(null);
      });
    return () => {
      alive = false;
    };
  }, [account, provider, chainId, tokenIn, txHash]);

  function reset() {
    generation.current++;
    setQuote(null);
    setRouteId("");
    setShowAll(false);
    setReviewOpen(false);
    setError("");
    setStatus("");
    setTxHash(null);
    setQuoting(false);
  }

  async function getQuote() {
    const mine = ++generation.current;
    setQuoting(true);
    setError("");
    setQuote(null);
    setReviewOpen(false);
    setStatus("");
    try {
      if (!tokenIn || !tokenOut) throw new Error("Live token configuration is unavailable.");
      parseAmount(amount, tokenIn.decimals);
      const params = new URLSearchParams({
        from: fromSymbol,
        to: toSymbol,
        amount,
        slippageBps: String(slippageBps),
        ...(account ? { account } : {}),
      });
      const result = await api<SwapQuote>(`/api/swap/quote?${params}`);
      if (mine !== generation.current) return;
      setQuote(result);
      setRouteId(result.routes[0].id);
      setShowAll(false);
      setNow(Date.now());
    } catch (e) {
      if (mine === generation.current) setError(e instanceof Error ? e.message : "Quote unavailable.");
    } finally {
      if (mine === generation.current) setQuoting(false);
    }
  }

  const route = quote?.routes.find((r) => r.id === routeId);
  const expired = !!quote && now >= quote.expiresAt;
  const wrongChain = !!account && chainId !== CHAIN_ID;
  const canExecute = !!quote && !!route?.executable && !expired && !!account && !wrongChain && !submitting;

  async function execute() {
    if (!quote || !route || !account || !provider) return;
    const q = quote;
    const r = route;
    const mine = generation.current;
    setSubmitting(true);
    setError("");
    setTxHash(null);

    const checked = async () => {
      if (generation.current !== mine) throw new Error("Wallet or swap inputs changed. Review again.");
      return verifyWallet(() => snapshot.current, account, CHAIN_ID);
    };
    const prepare = () =>
      api<PreparedSwap>("/api/swap/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId: q.id, routeId: r.id, account }),
      });
    const reader = robinhoodClient(CHAIN_ID);

    try {
      await checked();
      let prepared = await prepare();
      const held = q.tokenIn.native
        ? await reader.getBalance({ address: account })
        : await reader.readContract({ address: q.tokenIn.address, abi: erc20Abi, functionName: "balanceOf", args: [account] });
      if (held < BigInt(q.amountIn)) throw new Error(`Not enough ${q.tokenIn.symbol} for this swap.`);

      const spender = prepared.transaction.spender;
      if (spender) {
        const allowance = await reader.readContract({
          address: q.tokenIn.address,
          abi: erc20Abi,
          functionName: "allowance",
          args: [account, spender],
        });
        if (allowance < BigInt(q.amountIn)) {
          for (const value of allowance > 0n ? [0n, BigInt(q.amountIn)] : [BigInt(q.amountIn)]) {
            await prepare();
            await checked();
            setStatus(
              value === 0n
                ? "Confirm resetting the previous allowance in your wallet."
                : "Confirm the exact token approval in your wallet.",
            );
            const simulation = await reader.simulateContract({
              account,
              address: q.tokenIn.address,
              abi: erc20Abi,
              functionName: "approve",
              args: [spender, value],
            });
            const verified = await checked();
            const hash = await walletClientFor(verified.provider, CHAIN_ID, verified.account).writeContract(simulation.request);
            setTxHash(hash);
            const receipt = await reader.waitForTransactionReceipt({ hash, confirmations: 2 });
            if (receipt.status !== "success") throw new Error("Token approval reverted.");
          }
        }
      }

      prepared = await prepare();
      const tx = prepared.transaction;
      await checked();
      setStatus("Checking the transaction and gas balance…");
      const call = { account, to: tx.to as Address, data: tx.data, value: BigInt(tx.value) };
      await reader.call(call);
      const gas = ((await reader.estimateGas(call)) * 12n) / 10n;
      const [gasPrice, ethBalance] = await Promise.all([reader.getGasPrice(), reader.getBalance({ address: account })]);
      if (ethBalance < BigInt(tx.value) + gas * gasPrice * 2n) throw new Error("Not enough ETH for this swap and network gas.");
      await prepare();
      const verified = await checked();
      setStatus("Confirm the swap in your wallet.");
      const hash = await walletClientFor(verified.provider, CHAIN_ID, verified.account).sendTransaction({ ...call, gas });
      setTxHash(hash);
      setStatus("Swap submitted. Waiting for confirmation…");
      const receipt = await reader.waitForTransactionReceipt({ hash, confirmations: 2 });
      if (receipt.status !== "success") {
        throw new Error("Swap reverted. Your minimum output was not met or the quote expired.");
      }
      if (generation.current === mine) {
        setStatus("Swap confirmed.");
        setReviewOpen(false);
        setQuote(null);
        setAmount("");
        setBalance(null);
      }
    } catch (e) {
      if (generation.current === mine) {
        setError(
          e instanceof Error
            ? e.message.length > 350
              ? "The wallet or chain rejected this transaction. Check its status before trying again."
              : e.message
            : "Transaction unavailable.",
        );
      }
    } finally {
      if (generation.current === mine) setSubmitting(false);
    }
  }

  return (
    <div className="site-shell">
      <AppNav />
      <main className="dapp-main swap-main">
        <div className="dapp-heading">
          <div>
            <span className="section-kicker">A BETTER PATH THROUGH THE POOLS</span>
            <h1>Swap with a clear view.</h1>
            <p>Compare live quotes and see where your trade goes.</p>
          </div>
          <span className="outline-chip">ROBINHOOD CHAIN</span>
        </div>

        <div className="swap-layout">
          <section className="panel swap-card" aria-label="Swap form">
            <div className="swap-card-heading">
              <h2>Swap tokens</h2>
              <span className="muted">ETH for gas</span>
            </div>
            <fieldset disabled={submitting}>
              <div className="swap-token-box">
                <label htmlFor="swap-amount">You pay</label>
                <div className="swap-input-row">
                  <input
                    id="swap-amount"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => {
                      reset();
                      setAmount(e.target.value);
                    }}
                  />
                  <select
                    aria-label="Pay token"
                    value={fromSymbol}
                    onChange={(e) => {
                      reset();
                      setFromSymbol(e.target.value);
                    }}
                  >
                    {(config?.tokens ?? [{ symbol: "USDG" }]).map((t) => (
                      <option key={t.symbol}>{t.symbol}</option>
                    ))}
                  </select>
                </div>
                <small>Balance: {balance !== null && tokenIn ? `${formatSignificant(balance, tokenIn.decimals)} ${tokenIn.symbol}` : "—"}</small>
              </div>
              <button
                className="swap-reverse"
                aria-label="Reverse swap direction"
                onClick={() => {
                  reset();
                  setFromSymbol(toSymbol);
                  setToSymbol(fromSymbol);
                  setAmount("");
                }}
              >
                <ArrowDownUp size={18} />
              </button>
              <div className="swap-token-box">
                <label htmlFor="swap-output-token">You receive · estimated</label>
                <div className="swap-input-row">
                  <strong>{quote && route ? formatSignificant(route.amountOut, quote.tokenOut.decimals) : "—"}</strong>
                  <select
                    id="swap-output-token"
                    value={toSymbol}
                    onChange={(e) => {
                      reset();
                      setToSymbol(e.target.value);
                    }}
                  >
                    {(config?.tokens ?? [{ symbol: "SPY" }]).map((t) => (
                      <option key={t.symbol}>{t.symbol}</option>
                    ))}
                  </select>
                </div>
                <small>
                  {config?.tokens.some((t) => t.symbol === T)
                    ? `Quotes include available ${site.name} pool routes.`
                    : `${T} joins after token activation.`}
                </small>
              </div>
              <div className="swap-slippage">
                <label htmlFor="swap-slippage">Slippage tolerance</label>
                <select
                  id="swap-slippage"
                  value={slippageBps}
                  onChange={(e) => {
                    reset();
                    setSlippageBps(Number(e.target.value));
                  }}
                >
                  <option value={10}>0.10%</option>
                  <option value={50}>0.50%</option>
                  <option value={100}>1.00%</option>
                </select>
              </div>
            </fieldset>
            {wrongChain && (
              <button className="button secondary wide" onClick={() => void wallet.switchNetwork()}>
                Switch to Robinhood Chain
              </button>
            )}
            <button className="button secondary wide" disabled={!config || quoting || submitting || !amount} onClick={() => void getQuote()}>
              <RefreshCw size={15} />
              {quoting ? "Comparing live routes…" : "Get live quote"}
            </button>
            {account ? (
              <button className="button primary wide" disabled={!canExecute} onClick={() => setReviewOpen(true)}>
                {config?.active ? (expired ? "Refresh expired quote" : "Review swap") : "Trading opens after activation"}
                <ArrowRight size={17} />
              </button>
            ) : (
              <ConnectButton className="button primary wide" />
            )}
            {!config?.active && (
              <p className="swap-caption">
                Live market quotes are available now. Trading opens after protocol activation and market verification.
              </p>
            )}
            {error && (
              <p className="inline-error" role="alert">
                {error}
              </p>
            )}
            {status && <output className="swap-status">{status}</output>}
            {txHash && (
              <a className="text-link" href={`${chain.explorer}/tx/${txHash}`} target="_blank" rel="noreferrer">
                View transaction <ArrowUpRight size={14} />
              </a>
            )}
          </section>

          <section className="swap-routes" aria-label="Route comparison">
            <div className="section-title">
              <h2>Your route, explained.</h2>
              {quote && (
                <span className="outline-chip">
                  {expired ? "QUOTE EXPIRED" : `${Math.max(0, Math.ceil((quote.expiresAt - now) / 1000))}s remaining`}
                </span>
              )}
            </div>
            {quote ? (
              <>
                <p className="swap-caption">
                  {quote.ranking === "net"
                    ? "Sorted by estimated output after network costs."
                    : "Sorted by output; full gas estimates are unavailable."}{" "}
                  Checked V3 paths use at most two pools.{" "}
                  {config?.aggregator === "configured"
                    ? "0x quotes are included when available."
                    : "Wider aggregator quotes are not connected yet."}
                </p>
                {quote.routes.map((r, index) =>
                  !showAll && index >= 3 && r.id !== routeId ? null : (
                    <button
                      key={r.id}
                      className={`panel swap-route ${routeId === r.id ? "selected" : ""}`}
                      aria-pressed={routeId === r.id}
                      disabled={submitting}
                      onClick={() => {
                        setRouteId(r.id);
                        setReviewOpen(false);
                      }}
                    >
                      <div className="swap-route-title">
                        <strong>{r.label}</strong>
                        {index === 0 && (
                          <span className="swap-best">{quote.ranking === "net" ? "BEST ESTIMATED VALUE" : "HIGHEST QUOTED OUTPUT"}</span>
                        )}
                      </div>
                      <div className="swap-route-path">{r.symbols.join(" → ")}</div>
                      <div className="swap-route-result">
                        <strong>
                          {formatSignificant(r.amountOut, quote.tokenOut.decimals)} {quote.tokenOut.symbol}
                        </strong>
                        <small>Estimated network cost: {r.gasWei === null ? "unavailable" : `${formatSignificant(r.gasWei, 18)} ETH`}</small>
                      </div>
                      <p>
                        {r.source === "0x"
                          ? "Fees follow the aggregator’s selected liquidity sources."
                          : r.pools.map((p) => `${p.fee / 10_000}% · ${p.flowbank ? `${site.name} pool` : "External pool"}`).join(" + ")}
                      </p>
                      {config?.active && r.source === "v3" && r.impactBps === null && (
                        <p className="inline-error">Price impact could not be verified. This route cannot execute.</p>
                      )}
                      {config?.active && (!quote.tokenIn.tradeEnabled || !quote.tokenOut.tradeEnabled) && (
                        <p className="swap-caption">This market is awaiting eligibility verification.</p>
                      )}
                      {r.impactBps !== null && r.impactBps > 100 && (
                        <p className="inline-error">
                          Estimated price impact: {(r.impactBps / 100).toFixed(2)}%{r.impactBps > 300 ? " · Too high to execute here." : ""}
                        </p>
                      )}
                    </button>
                  ),
                )}
                {quote.routes.length > 3 && (
                  <button className="button secondary wide" disabled={submitting} onClick={() => setShowAll(!showAll)}>
                    {showAll ? "Show fewer routes" : `Compare all ${quote.routes.length} routes`}
                  </button>
                )}
                {route && (
                  <dl className="detail-rows swap-summary">
                    <div>
                      <dt>Minimum received</dt>
                      <dd>
                        {exact(route.minimumOut, quote.tokenOut.decimals)} {quote.tokenOut.symbol}
                      </dd>
                    </div>
                    <div>
                      <dt>Quoted at block</dt>
                      <dd>{quote.block}</dd>
                    </div>
                    <div>
                      <dt>{site.name} interface fee</dt>
                      <dd>None</dd>
                    </div>
                  </dl>
                )}
                {quote.warnings.map((warning) => (
                  <p key={warning} className="swap-caption">
                    {warning}
                  </p>
                ))}
              </>
            ) : (
              <div className="panel swap-route-empty">
                <Route size={32} />
                <h3>Find a route that works for you.</h3>
                <p>
                  Enter an amount to compare direct pools and routes through other markets. {site.name} pools participate when they
                  are live.
                </p>
                <div className="swap-principles">
                  <span>
                    <ShieldCheck size={17} /> Minimum output protection
                  </span>
                  <span>
                    <Route size={17} /> Choose your preferred route
                  </span>
                </div>
              </div>
            )}
            <p className="swap-caption">
              Pool fees belong to the liquidity providers on the selected route. Only {site.name}’s protocol-owned share funds
              community rewards. Gas and approval costs are paid separately.
            </p>
            <Link className="text-link" href="/docs/swapping">
              How swaps and routing work <ArrowUpRight size={15} />
            </Link>
          </section>
        </div>

        <Dialog
          open={reviewOpen}
          onOpenChange={(open) => {
            if (!submitting) setReviewOpen(open);
          }}
        >
          <DialogContent className="transaction-dialog">
            <DialogTitle>Review your swap</DialogTitle>
            <DialogDescription>
              Approvals and the swap require separate wallet confirmations. Your quote can expire while approvals are pending.
            </DialogDescription>
            {quote && route && (
              <dl className="detail-rows">
                <div>
                  <dt>You pay</dt>
                  <dd>
                    {exact(quote.amountIn, quote.tokenIn.decimals)} {quote.tokenIn.symbol}
                  </dd>
                </div>
                <div>
                  <dt>Minimum received</dt>
                  <dd>
                    {exact(route.minimumOut, quote.tokenOut.decimals)} {quote.tokenOut.symbol}
                  </dd>
                </div>
                <div>
                  <dt>Route</dt>
                  <dd>{route.symbols.join(" → ")}</dd>
                </div>
                <div>
                  <dt>Slippage</dt>
                  <dd>{slippageBps / 100}%</dd>
                </div>
              </dl>
            )}
            {error && (
              <p role="alert" className="inline-error">
                {error}
              </p>
            )}
            {status && <output>{status}</output>}
            {txHash && (
              <a href={`${chain.explorer}/tx/${txHash}`} target="_blank" rel="noreferrer">
                View transaction
              </a>
            )}
            <button className="button primary" disabled={!canExecute} onClick={() => void execute()}>
              {submitting ? "Waiting for wallet / confirmation…" : expired ? "Quote expired — close and refresh" : "Confirm in wallet"}
            </button>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
