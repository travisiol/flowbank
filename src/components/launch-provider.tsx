"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import type { LaunchManifest } from "@/lib/types";

type LaunchState = { launch: LaunchManifest | null; error: string | null; loading: boolean };

const LaunchContext = createContext<LaunchState>({ launch: null, error: null, loading: true });

const UNAVAILABLE = "Live status is unavailable. Transactions are disabled.";

/**
 * Polls /api/launch. Before activation it asks every 5 s so the site flips
 * to the live screens without a rebuild; once active it settles to 30 s.
 */
export function LaunchProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LaunchState>({ launch: null, error: null, loading: true });

  useEffect(() => {
    let alive = true;
    let active = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      try {
        const response = await fetch("/api/launch", { cache: "no-store" });
        if (!response.ok) throw new Error(UNAVAILABLE);
        const manifest = (await response.json()) as LaunchManifest;
        active = manifest.phase === "active";
        if (alive) setState({ launch: manifest, error: null, loading: false });
      } catch {
        if (alive) setState({ launch: null, error: UNAVAILABLE, loading: false });
      }
      if (alive) timer = setTimeout(poll, active ? 30_000 : 5_000);
    };
    poll();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);

  return <LaunchContext.Provider value={state}>{children}</LaunchContext.Provider>;
}

export const useLaunch = () => useContext(LaunchContext);
