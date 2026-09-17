"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { encodeFunctionData, parseUnits, type Abi, type Address, type Hex } from "viem";

import { usePools } from "@/components/data-hooks";
import type { DappView } from "@/components/dapp/prelaunch-view";
import { AppNav } from "@/components/site-chrome";
import { useWallet } from "@/components/wallet-provider";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { configAbi, erc20Abi, holdersAbi, poolAbi, positionManagerAbi, stakingAbi } from "@/lib/abi";
import { robinhoodClient, sameAddress, verifyWallet, walletClientFor, type WalletSnapshot } from "@/lib/chain";
import { formatExact, formatToken, formatUsd, shortAddress } from "@/lib/format";
import { explorerAddress, explorerTx, site } from "@/lib/site";
import type { HolderClaim, LaunchManifest, Market, RewardsResponse } from "@/lib/types";
import { amountsForLiquidity, applySlippage, getSqrtRatioAtTick, pairedAmount0, pairedAmount1 } from "@/lib/v3";

const MAX_UINT128 = (1n << 128n) - 1n;
const stamp = () => Date.now();
const PAGE = 20;
const T = site.ticker;

type Balances = { reserve: bigint; reward: bigint; staked: bigint; earned: bigint; totalStaked: bigint };

type Position = {
  id: bigint;
  market: Market;
  liquidity: bigint;
  lower: number;
  upper: number;
  amount0: bigint;
  amount1: bigint;
  fee0: bigint;
  fee1: bigint;
};

type Review = { title: string; details: Array<[string, string]>; execute: () => Promise<void>; created: number };

/**
 * Every live dapp screen is this one component with a `view` switch, so the
 * wallet reads, the transaction review dialog and the refresh cycle are
 * shared. Nothing here is estimated: balances come from the chain at a
 * confirmed block, and a review expires after 60 s.
 */
export function LiveView({ manifest, view, poolId }: { manifest: LaunchManifest; view: DappView; poolId?: string }) {
  const wallet = useWallet();
  const { account, provider } = wallet;

  const [loaded, setLoaded] = useState(false);
  const [balances, setBalances] = useState<Balances>({ reserve: 0n, reward: 0n, staked: 0n, earned: 0n, totalStaked: 0n });
  const [positions, setPositions] = useState<Position[]>([]);
  const [positionOffset, setPositionOffset] = useState(0);
  const [claimCursor, setClaimCursor] = useState(0);
  const [nextClaimCursor, setNextClaimCursor] = useState<number | null>(null);
  const [nftCount, setNftCount] = useState(0);
  const [amount, setAmount] = useState("");
  const [stakeMode, setStakeMode] = useState<"stake" | "withdraw">("stake");
  const [review, setReview] = useState<Review | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [txHash, setTxHash] = useState<Hex | null>(null);
  const [active, setActive] = useState(false);
  const [block, setBlock] = useState<bigint | null>(null);
  const [copied, setCopied] = useState("");
  const pools = usePools();
  const [claims, setClaims] = useState<HolderClaim[]>([]);

  const snapshot = useRef<WalletSnapshot>({ account, provider });
  useLayoutEffect(() => {
    snapshot.current = { account, provider };
    return () => {
      snapshot.current = { account: null, provider: null };
    };
  }, [account, provider]);

  const market = manifest.markets.find((m) => m.id === poolId);
  const poolSnapshot = market ? pools.find((p) => p.id === market.id) : undefined;
  const client = robinhoodClient(manifest.chainId);

  const refresh = useCallback(async () => {
    try {
      const reader = robinhoodClient(manifest.chainId);
      setBlock(await reader.getBlockNumber());
      setActive(!!(await reader.readContract({ address: manifest.registry, abi: configAbi, functionName: "active" })));
      if (!account || !manifest.token) return;

      const read = <T,>(address: Address, abi: Abi, functionName: string, args: unknown[] = []) =>
        reader.readContract({ address, abi, functionName, args }) as Promise<T>;

      const results = await Promise.all([
        read<bigint>(manifest.token, erc20Abi, "balanceOf", [account]),
        read<bigint>(manifest.rewardToken, erc20Abi, "balanceOf", [account]),
        read<bigint>(manifest.staking, stakingAbi, "balanceOf", [account]),
        read<bigint>(manifest.staking, stakingAbi, "earned", [account]),
        read<bigint>(manifest.staking, stakingAbi, "totalStaked"),
      ]);
      if (!snapshot.current.account || !sameAddress(snapshot.current.account, account)) return;
      setLoaded(true);
      setBalances({ reserve: results[0], reward: results[1], staked: results[2], earned: results[3], totalStaked: results[4] });

      const count = Number(await read<bigint>(manifest.positionManager, positionManagerAbi, "balanceOf", [account]));
      setNftCount(count);
      const found: Position[] = [];
      for (let index = positionOffset; index < Math.min(count, positionOffset + PAGE); index++) {
        const tokenId = await reader.readContract({
          address: manifest.positionManager,
          abi: positionManagerAbi,
          functionName: "tokenOfOwnerByIndex",
          args: [account, BigInt(index)],
        });
        const position = await reader.readContract({
          address: manifest.positionManager,
          abi: positionManagerAbi,
          functionName: "positions",
          args: [tokenId],
        });
        const matched = manifest.markets.find(
          (m) => sameAddress(m.token0, position[2]) && sameAddress(m.token1, position[3]) && m.fee === position[4],
        );
        if (!matched) continue;
        const slot0 = await reader.readContract({ address: matched.pool, abi: poolAbi, functionName: "slot0" });
        const amounts = amountsForLiquidity(slot0[0], getSqrtRatioAtTick(position[5]), getSqrtRatioAtTick(position[6]), position[7]);
        const owed = await reader
          .simulateContract({
            account,
            address: manifest.positionManager,
            abi: positionManagerAbi,
            functionName: "collect",
            args: [{ tokenId, recipient: account, amount0Max: MAX_UINT128, amount1Max: MAX_UINT128 }],
          })
          .catch(() => ({ result: [0n, 0n] as const }));
        found.push({
          id: tokenId,
          market: matched,
          liquidity: position[7],
          lower: position[5],
          upper: position[6],
          ...amounts,
          fee0: owed.result[0],
          fee1: owed.result[1],
        });
      }
      if (!snapshot.current.account || !sameAddress(snapshot.current.account, account)) return;
      setPositions(found);

      const response = await fetch(`/api/rewards/${account}?cursor=${claimCursor}`, { cache: "no-store" });
      if (!snapshot.current.account || !sameAddress(snapshot.current.account, account)) return;
      if (response.ok) {
        const data = (await response.json()) as RewardsResponse;
        setClaims(data.claims ?? []);
        setNextClaimCursor(data.nextCursor ?? null);
      } else {
        setClaims([]);
        setError("Holder proofs are temporarily unavailable. Existing claims remain recorded onchain.");
      }
    } catch {
      setError("Could not refresh confirmed chain data. Refresh before submitting a transaction.");
      setActive(false);
      setLoaded(false);
    }
  }, [manifest, account, positionOffset, claimCursor]);

  useEffect(() => {
    const first = setTimeout(refresh, 0);
    const timer = setInterval(refresh, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [refresh]);

  async function checkedWallet() {
    const verified = await verifyWallet(() => snapshot.current, account, manifest.chainId);
    return { ...verified, wallet: walletClientFor(verified.provider, manifest.chainId, verified.account) };
  }

  async function send(address: Address, abi: Abi, functionName: string, args: unknown[] = []) {
    const before = await checkedWallet();
    const simulation = await client.simulateContract({ account: before.account, address, abi, functionName, args });
    const after = await checkedWallet();
    if (after.provider !== before.provider) throw new Error("Wallet changed. Review this transaction again.");
    const hash = await after.wallet.writeContract(simulation.request);
    setTxHash(hash);
    setStatus("Waiting for confirmation…");
    const receipt = await client.waitForTransactionReceipt({ hash, confirmations: 2 });
    if (receipt.status !== "success") throw new Error("Transaction reverted.");
  }

  async function ensureAllowance(token: Address, spender: Address, needed: bigint) {
    const { account: owner } = await checkedWallet();
    const allowance = await client.readContract({ address: token, abi: erc20Abi, functionName: "allowance", args: [owner, spender] });
    if (allowance < needed) {
      if (allowance > 0n) await send(token, erc20Abi, "approve", [spender, 0n]);
      await send(token, erc20Abi, "approve", [spender, needed]);
    }
  }

  function openReview(title: string, details: Array<[string, string]>, execute: () => Promise<void>) {
    setError("");
    setTxHash(null);
    setStatus("");
    setReview({ title, details, execute, created: stamp() });
  }

  function reviewStake() {
    try {
      const value = parseUnits(amount, manifest.tokenDecimals);
      if (value <= 0n || value > (stakeMode === "stake" ? balances.reserve : balances.staked)) {
        throw new Error("Enter an amount within your available balance.");
      }
      if (!manifest.token) throw new Error("Token unavailable");
      const token = manifest.token;
      openReview(
        stakeMode === "stake" ? `Stake ${T}` : `Withdraw ${T}`,
        [
          ["Amount", `${amount} ${T}`],
          ["Contract", manifest.staking],
          ["Approval", stakeMode === "stake" ? "Exact entered amount, if needed" : "None"],
          ["Network", "Robinhood Chain"],
          ["Gas", "Paid in ETH; shown by your wallet"],
        ],
        async () => {
          if (stakeMode === "stake") await ensureAllowance(token, manifest.staking, value);
          await send(manifest.staking, stakingAbi, stakeMode, [value]);
        },
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid amount");
    }
  }

  async function reviewDeposit() {
    try {
      if (!market || !manifest.token || !account) throw new Error("Connect a wallet and select a pool.");
      const quotedAt = stamp() + 60_000;
      const reserveIn = parseUnits(amount, manifest.tokenDecimals);
      if (reserveIn <= 0n) throw new Error("Enter a positive amount.");
      const slot0 = await client.readContract({ address: market.pool, abi: poolAbi, functionName: "slot0" });
      const lower = getSqrtRatioAtTick(market.tickLower);
      const upper = getSqrtRatioAtTick(market.tickUpper);
      const reserveIsToken0 = sameAddress(market.token0, manifest.token);
      const paired = reserveIsToken0 ? pairedAmount1(slot0[0], lower, upper, reserveIn) : pairedAmount0(slot0[0], lower, upper, reserveIn);
      if (paired === null || paired <= 0n) throw new Error("Pool price is outside the supported range.");
      const assetIn = paired + 1n;
      const [amount0, amount1] = reserveIsToken0 ? [reserveIn, assetIn] : [assetIn, reserveIn];
      const owner = account;
      const [reserveBalance, assetBalance] = await Promise.all([
        client.readContract({ address: manifest.token, abi: erc20Abi, functionName: "balanceOf", args: [owner] }),
        client.readContract({ address: market.asset, abi: erc20Abi, functionName: "balanceOf", args: [owner] }),
      ]);
      if (reserveBalance < reserveIn) {
        throw new Error(
          `This deposit needs ${formatToken(reserveIn, manifest.tokenDecimals)} ${T}; your wallet holds ${formatToken(reserveBalance, manifest.tokenDecimals)}.`,
        );
      }
      if (assetBalance < assetIn) {
        throw new Error(
          `This deposit also needs ${formatToken(assetIn, market.decimals)} ${market.symbol}; your wallet holds ${formatToken(assetBalance, market.decimals)}. Acquire ${market.symbol} first — both sides of the pair are deposited.`,
        );
      }
      openReview(
        "Add liquidity",
        [
          [T, formatExact(reserveIn, manifest.tokenDecimals)],
          [market.symbol, formatExact(assetIn, market.decimals)],
          ["Position owner", owner],
          ["Approval spender", manifest.positionManager],
          ["Slippage", "1% maximum"],
          ["Gas", "Paid in ETH; shown by your wallet"],
        ],
        async () => {
          await ensureAllowance(market.token0, manifest.positionManager, amount0);
          await ensureAllowance(market.token1, manifest.positionManager, amount1);
          if (Date.now() > quotedAt) throw new Error("Approvals confirmed. Request a fresh deposit quote before continuing.");
          await send(manifest.positionManager, positionManagerAbi, "mint", [
            {
              token0: market.token0,
              token1: market.token1,
              fee: market.fee,
              tickLower: market.tickLower,
              tickUpper: market.tickUpper,
              amount0Desired: amount0,
              amount1Desired: amount1,
              amount0Min: applySlippage(amount0, 100),
              amount1Min: applySlippage(amount1, 100),
              recipient: owner,
              deadline: BigInt(Math.floor(Date.now() / 1000) + 120),
            },
          ]);
        },
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not quote the deposit.");
    }
  }

  function reviewPosition(position: Position, withdraw: boolean) {
    const recipient = account as Address;
    const reserveIsToken0 = sameAddress(position.market.token0, manifest.token);
    const pair = (a0: bigint, a1: bigint) =>
      `${formatToken(reserveIsToken0 ? a0 : a1, manifest.tokenDecimals)} ${T} + ${formatToken(reserveIsToken0 ? a1 : a0, position.market.decimals)} ${position.market.symbol}`;
    openReview(
      withdraw ? "Withdraw full position" : "Claim personal LP tokens",
      [
        ["Position", position.id.toString()],
        ["Principal", withdraw ? pair(position.amount0, position.amount1) : "Unchanged"],
        ["Claimable tokens", pair(position.fee0, position.fee1)],
        ["Includes", "LP fees and any principal left uncollected through another app"],
        ["Recipient", recipient],
        ["Slippage", withdraw ? "1% maximum on principal" : "Not applicable"],
      ],
      async () => {
        const collect = { tokenId: position.id, recipient, amount0Max: MAX_UINT128, amount1Max: MAX_UINT128 };
        if (withdraw) {
          await send(manifest.positionManager, positionManagerAbi, "multicall", [
            [
              encodeFunctionData({
                abi: positionManagerAbi,
                functionName: "decreaseLiquidity",
                args: [
                  {
                    tokenId: position.id,
                    liquidity: position.liquidity,
                    amount0Min: applySlippage(position.amount0, 100),
                    amount1Min: applySlippage(position.amount1, 100),
                    deadline: BigInt(Math.floor(Date.now() / 1000) + 120),
                  },
                ],
              }),
              encodeFunctionData({ abi: positionManagerAbi, functionName: "collect", args: [collect] }),
            ],
          ]);
        } else {
          await send(manifest.positionManager, positionManagerAbi, "collect", [collect]);
        }
      },
    );
  }

  async function confirmReview() {
    if (!review) return;
    setBusy(true);
    setError("");
    try {
      if (Date.now() - review.created > 60_000) throw new Error("This review expired. Close it and request a fresh quote.");
      await review.execute();
      setStatus("Transaction confirmed. Balances refreshed.");
      setReview(null);
      setAmount("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message.slice(0, 240) : "Transaction was not completed.");
    } finally {
      setBusy(false);
    }
  }

  function copy(value: string, key: string) {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(""), 1600);
    });
  }

  const shownPositions = poolId ? positions.filter((p) => p.market.id === poolId) : positions;
  const connected = account && loaded;

  return (
    <div className="site-shell">
      <AppNav />
      <main className="dapp-main">
        <div className="live-wallet-row">
          <span className="outline-chip">{active ? "LIVE ON ROBINHOOD CHAIN" : "NEW DEPOSITS PAUSED"}</span>
        </div>
        {account && wallet.chainId !== manifest.chainId && (
          <div className="network-notice">
            <span>Switch to Robinhood Chain before transacting.</span>
            <button className="button secondary" onClick={() => void wallet.switchNetwork()}>
              Switch network
            </button>
          </div>
        )}
        <div className="dapp-heading">
          <div>
            <span className="section-kicker">{site.nameUpper}</span>
            <h1>
              {market
                ? `${market.symbol} / ${T}`
                : view === "staking"
                  ? `Stake ${T}`
                  : view === "rewards"
                    ? "Your earned rewards"
                    : view === "positions"
                      ? "Your liquidity positions"
                      : `Your share of ${site.name}.`}
            </h1>
            <p>Confirmed onchain balances. Transactions require your wallet signature.</p>
          </div>
        </div>
        {error && (
          <p role="alert" className="inline-error">
            {error}
          </p>
        )}
        {status && <output>{status}</output>}
        {txHash && (
          <a className="subtle-link" href={explorerTx(manifest.chainId, txHash)} target="_blank" rel="noreferrer">
            View transaction {shortAddress(txHash)}
          </a>
        )}

        {market && (
          <section className="metrics pool-metrics">
            <article>
              <div>Pool liquidity</div>
              <strong>{poolSnapshot?.tvlUsd == null ? "—" : formatUsd(poolSnapshot.tvlUsd)}</strong>
              <small>
                {poolSnapshot
                  ? `${Math.round(poolSnapshot.reserveAmount).toLocaleString("en-US")} ${T} + ${poolSnapshot.assetAmount.toLocaleString("en-US", { maximumFractionDigits: 4 })} ${market.symbol}`
                  : "Reading the pool"}
              </small>
            </article>
            <article>
              <div>Protocol owned</div>
              <strong>{poolSnapshot?.protocolTvlUsd == null ? "—" : formatUsd(poolSnapshot.protocolTvlUsd)}</strong>
              <small>Funded by claimed creator fees; never withdrawn</small>
            </article>
            <article>
              <div>Community owned</div>
              <strong>{poolSnapshot?.communityTvlUsd == null ? "—" : formatUsd(poolSnapshot.communityTvlUsd)}</strong>
              <small>Deposits owned by wallets like yours</small>
            </article>
            <article>
              <div>Total {T} staked</div>
              <strong>{formatToken(balances.totalStaked, manifest.tokenDecimals)}</strong>
              <small>Protocol-wide stake earning USDG rewards</small>
            </article>
          </section>
        )}

        {market && (
          <section className="panel address-panel">
            <h2>Contracts</h2>
            <dl className="detail-rows">
              {(
                [
                  ["Pool", market.pool],
                  [`${market.symbol} token`, market.asset],
                  [`${T} token`, manifest.token],
                ] as Array<[string, string]>
              ).map(([label, address]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd className="address-row">
                    <button type="button" title={address} aria-label={`Copy the ${label} address`} onClick={() => copy(address, label)}>
                      {address}
                      {copied === label ? " ✓" : " ⧉"}
                    </button>
                    <a href={explorerAddress(address)} target="_blank" rel="noopener noreferrer">
                      Explorer ↗
                    </a>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <section className="metrics">
          <article>
            <div>Available {T}</div>
            <strong>{connected ? formatToken(balances.reserve, manifest.tokenDecimals) : "—"}</strong>
          </article>
          <article>
            <div>Staked {T}</div>
            <strong>{connected ? formatToken(balances.staked, manifest.tokenDecimals) : "—"}</strong>
          </article>
          <article>
            <div>Staking rewards · USDG</div>
            <strong>{connected ? formatToken(balances.earned, manifest.rewardDecimals) : "—"}</strong>
          </article>
          <article>
            <div>Confirmed block</div>
            <strong>{block?.toString() ?? "—"}</strong>
            <small>
              <button onClick={() => refresh()}>Refresh balances</button>
            </small>
          </article>
        </section>

        {(view === "pools" || view === "dashboard") && (
          <section className="doc-cards">
            {manifest.markets.map((m) => {
              const snapshotFor = pools.find((p) => p.id === m.id);
              return (
                <div key={m.id} className="pool-card">
                  <a href={`/pools/${m.id}`}>
                    <h2>
                      {m.symbol} / {T}
                    </h2>
                    <p>
                      {m.fee / 10_000}% pool fee · {m.enabled ? "Open pool" : "Deposits paused"}
                    </p>
                    <strong className="pool-tvl">
                      {snapshotFor?.tvlUsd == null ? "Liquidity loading…" : `${formatUsd(snapshotFor.tvlUsd)} liquidity`}
                    </strong>
                  </a>
                  <div className="pool-address">
                    <button type="button" title={m.pool} aria-label={`Copy the ${m.symbol} pool address`} onClick={() => copy(m.pool, m.id)}>
                      {shortAddress(m.pool)}
                      {copied === m.id ? " ✓ copied" : " ⧉"}
                    </button>
                    <a href={explorerAddress(m.pool)} target="_blank" rel="noopener noreferrer">
                      Explorer ↗
                    </a>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {(view === "staking" || view === "dashboard") && (
          <section className="panel liquidity-form live-action-panel">
            <h2>{stakeMode === "stake" ? `Put your ${T} to work.` : "Withdraw your stake."}</h2>
            <div className="hero-actions">
              <button className="button secondary" onClick={() => setStakeMode("stake")}>
                Stake
              </button>
              <button className="button secondary" onClick={() => setStakeMode("withdraw")}>
                Withdraw
              </button>
            </div>
            <label className="amount-label" htmlFor="live-stake">
              {T} amount
            </label>
            <div className="token-input">
              <input id="live-stake" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <span>{T}</span>
            </div>
            <button className="button primary wide" disabled={!account || busy || (stakeMode === "stake" && !active)} onClick={reviewStake}>
              Review {stakeMode}
            </button>
            <p>Rewards accrue over time from funded USDG. Withdrawals do not claim rewards or erase earned entitlements.</p>
          </section>
        )}

        {market && (
          <section className="panel liquidity-form live-action-panel">
            <h2>Add liquidity</h2>
            <p>Your wallet owns the position NFT and receives its LP fees.</p>
            <label className="amount-label" htmlFor="live-deposit">
              {T} amount
            </label>
            <div className="token-input">
              <input id="live-deposit" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <span>{T}</span>
            </div>
            <button className="button primary wide" disabled={!account || busy || !active || !market.enabled} onClick={reviewDeposit}>
              Get deposit quote
            </button>
            <p>The review calculates the paired {market.symbol} amount from the pool price. Gas is paid in ETH.</p>
          </section>
        )}

        {(view === "positions" || view === "dashboard" || !!market) && (
          <section className="dapp-section panel">
            <h2>Personal liquidity</h2>
            {account ? (
              shownPositions.length ? (
                shownPositions.map((position) => (
                  <article key={position.id.toString()} className="live-position">
                    <div>
                      <strong>
                        {position.market.symbol} / {T}
                      </strong>
                      <small>Position #{position.id.toString()} · Your wallet owns the NFT</small>
                    </div>
                    <button className="button secondary" disabled={busy || position.liquidity === 0n} onClick={() => reviewPosition(position, true)}>
                      Review full withdrawal
                    </button>
                    <button
                      className="button secondary"
                      disabled={busy || (position.fee0 === 0n && position.fee1 === 0n)}
                      onClick={() => reviewPosition(position, false)}
                    >
                      Review fee claim
                    </button>
                  </article>
                ))
              ) : (
                <p>No {site.name} positions in this page of your wallet’s NFTs.</p>
              )
            ) : (
              <p>Connect your wallet to view positions.</p>
            )}
            {nftCount > PAGE && (
              <div className="hero-actions">
                <button disabled={positionOffset === 0} onClick={() => setPositionOffset(Math.max(0, positionOffset - PAGE))}>
                  Previous
                </button>
                <span>
                  Wallet NFTs {positionOffset + 1}–{Math.min(positionOffset + PAGE, nftCount)} of {nftCount}
                </span>
                <button disabled={positionOffset + PAGE >= nftCount} onClick={() => setPositionOffset(positionOffset + PAGE)}>
                  Next
                </button>
              </div>
            )}
          </section>
        )}

        {(view === "rewards" || view === "staking" || view === "dashboard") && (
          <section className="dapp-section panel">
            <h2>Claim rewards</h2>
            <p>Staking: {connected ? formatToken(balances.earned, manifest.rewardDecimals) : "—"} USDG</p>
            <button
              className="button primary"
              disabled={!account || busy || balances.earned === 0n}
              onClick={() =>
                openReview(
                  "Claim staking rewards",
                  [
                    ["Estimated USDG", formatToken(balances.earned, manifest.rewardDecimals)],
                    ["Principal", "Unchanged"],
                  ],
                  () => send(manifest.staking, stakingAbi, "claim"),
                )
              }
            >
              Review staking claim
            </button>
            {claims.map((claim) => (
              <div key={claim.epoch} className="live-position">
                <span>
                  Holder epoch {claim.epoch} · {formatToken(BigInt(claim.amount), manifest.rewardDecimals)} USDG
                </span>
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() =>
                    openReview(
                      "Claim holder rewards",
                      [
                        ["Epoch", String(claim.epoch)],
                        ["USDG", formatToken(BigInt(claim.amount), manifest.rewardDecimals)],
                      ],
                      () => send(manifest.holders, holdersAbi, "claim", [BigInt(claim.epoch), account, BigInt(claim.amount), claim.proof]),
                    )
                  }
                >
                  Review holder claim
                </button>
              </div>
            ))}
            {!claims.length && <p>No unclaimed holder allocation is available in this page.</p>}
            {(claimCursor > 0 || nextClaimCursor !== null) && (
              <div className="hero-actions">
                <button disabled={claimCursor === 0} onClick={() => setClaimCursor(Math.max(0, claimCursor - PAGE))}>
                  Newer epochs
                </button>
                <button
                  disabled={nextClaimCursor === null}
                  onClick={() => {
                    if (nextClaimCursor !== null) setClaimCursor(nextClaimCursor);
                  }}
                >
                  Older epochs
                </button>
              </div>
            )}
          </section>
        )}

        <p className="dapp-notice">
          Pool prices move and LP value can fall. Pool fees belong to each position; only protocol-owned LP fees fund holder and
          staking rewards. Pausing {site.name}’s new deposits does not remove your ability to manage your NFT through the DEX
          directly.
        </p>

        <Dialog
          open={!!review}
          onOpenChange={(open) => {
            if (!open && !busy) setReview(null);
          }}
        >
          <DialogContent className="transaction-dialog">
            <DialogTitle>{review?.title ?? "Review transaction"}</DialogTitle>
            <DialogDescription>
              Review the real transaction below. Token approvals, if needed, require separate wallet confirmations. No transaction
              is sent until you confirm.
            </DialogDescription>
            <dl className="detail-rows">
              {review?.details.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            {error && (
              <p role="alert" className="inline-error">
                {error}
              </p>
            )}
            <button className="button primary" disabled={busy} onClick={confirmReview}>
              {busy ? "Waiting for wallet / confirmation…" : "Confirm in wallet"}
            </button>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

