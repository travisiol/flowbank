"use client";

import { useEffect, useState } from "react";

import type { LaunchpadStatus, PoolSnapshot, PoolsResponse, ProtocolStatus } from "@/lib/types";

/** Curve status of the launch venue, refreshed every 30 s. */
export function useLaunchpad(intervalMs = 30_000) {
  const [status, setStatus] = useState<LaunchpadStatus | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/launchpad")
        .then((r) => (r.ok ? (r.json() as Promise<LaunchpadStatus>) : null))
        .then((data) => {
          if (alive && data && data.curveEth) setStatus(data);
        })
        .catch(() => {});
    load();
    const timer = setInterval(load, intervalMs);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [intervalMs]);
  return status;
}

/** Pool balances and USD values read by the server, refreshed every 30 s. */
export function usePools(intervalMs = 30_000) {
  const [pools, setPools] = useState<PoolSnapshot[]>([]);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/pools")
        .then((r) => (r.ok ? (r.json() as Promise<PoolsResponse>) : null))
        .then((data) => {
          if (alive && data?.pools) setPools(data.pools);
        })
        .catch(() => {});
    load();
    const timer = setInterval(load, intervalMs);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [intervalMs]);
  return pools;
}

/** Headline protocol counters; `key` forces a refetch when it changes. */
export function useProtocol(key: unknown, intervalMs = 30_000) {
  const [status, setStatus] = useState<ProtocolStatus | null>(null);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const response = await fetch("/api/protocol", { cache: "no-store" });
        if (!response.ok) throw new Error();
        const data = (await response.json()) as ProtocolStatus;
        if (alive) setStatus(data);
      } catch {
        if (alive) setStatus(null);
      }
    };
    load();
    const timer = setInterval(load, intervalMs);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [key, intervalMs]);
  return status;
}
