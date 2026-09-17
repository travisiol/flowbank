"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { isAddress, type Address, type EIP1193Provider } from "viem";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { chain, explorerAddress } from "@/lib/site";

type WalletState = {
  account: Address | null;
  provider: EIP1193Provider | null;
  chainId: number | null;
  ready: boolean;
  error: string | null;
  connecting: boolean;
};

type WalletContextValue = WalletState & {
  open: () => Promise<void>;
  disconnect: () => Promise<void>;
  switchNetwork: () => Promise<void>;
};

const initial: WalletState = { account: null, provider: null, chainId: null, ready: false, error: null, connecting: false };

const WalletContext = createContext<WalletContextValue | null>(null);

const hasAppKit = !!process.env.NEXT_PUBLIC_REOWN_PROJECT_ID;

type ReownModule = typeof import("@/lib/reown");
let reownModule: Promise<ReownModule> | null = null;
const loadReown = () =>
  (reownModule ??= import("@/lib/reown").catch((error) => {
    reownModule = null;
    throw error;
  }));

/**
 * Wallet connection for the whole site. With a Reown project id the header
 * button opens AppKit (WalletConnect + browser wallets); without one it
 * falls back to the injected browser wallet so the dapp still works
 * locally. Both paths expose the same shape to the pages.
 */
export function WalletProvider({ children }: { children: ReactNode }) {
  return hasAppKit ? <AppKitWallet>{children}</AppKitWallet> : <InjectedWallet>{children}</InjectedWallet>;
}

function AppKitWallet({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>(initial);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    let unsubscribe: Array<() => void> = [];
    loadReown()
      .then(({ appKit }) => {
        if (!alive) return;
        const sync = () => {
          if (!alive) return;
          const account = appKit.getAccount("eip155");
          const provider = appKit.getWalletProvider() as EIP1193Provider | undefined;
          const id = Number(appKit.getChainId());
          setState({
            account: account?.isConnected && account.address && isAddress(account.address) ? account.address : null,
            provider: provider && typeof provider.request === "function" ? provider : null,
            chainId: Number.isSafeInteger(id) && id > 0 ? id : null,
            ready: true,
            error: null,
            connecting: account?.status === "connecting" || account?.status === "reconnecting",
          });
        };
        unsubscribe = [
          appKit.subscribeAccount(sync, "eip155"),
          appKit.subscribeProviders(sync),
          appKit.subscribeNetwork(sync),
        ];
        sync();
      })
      .catch(() => {
        if (alive) setState({ ...initial, error: "Wallet connection is temporarily unavailable. Please try again." });
      });
    return () => {
      alive = false;
      unsubscribe.forEach((fn) => fn());
    };
  }, [attempt]);

  const open = useCallback(async () => {
    try {
      const { appKit } = await loadReown();
      if (!state.ready) setAttempt((n) => n + 1);
      await appKit.open({ view: state.account ? "Account" : "Connect" });
    } catch {
      setState((s) => ({ ...s, error: "Could not open wallet connection. Please reload and try again." }));
    }
  }, [state.account, state.ready]);

  const disconnect = useCallback(async () => {
    try {
      const { appKit } = await loadReown();
      await appKit.disconnect("eip155");
      setState({ ...initial, ready: true });
    } catch {
      setState((s) => ({ ...s, error: "Could not disconnect. Open your wallet to end this session." }));
    }
  }, []);

  const switchNetwork = useCallback(async () => {
    try {
      const { appKit, robinhood } = await loadReown();
      await appKit.switchNetwork(robinhood, { throwOnFailure: true });
    } catch {
      setState((s) => ({ ...s, error: "Switch to Robinhood Chain in your wallet to continue." }));
    }
  }, []);

  const value = useMemo(() => ({ ...state, open, disconnect, switchNetwork }), [state, open, disconnect, switchNetwork]);
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

const STORAGE_KEY = "flowbank.wallet";

function injectedProvider(): EIP1193Provider | null {
  if (typeof window === "undefined") return null;
  const candidate = (window as unknown as { ethereum?: EIP1193Provider }).ethereum;
  return candidate && typeof candidate.request === "function" ? candidate : null;
}

function InjectedWallet({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>(initial);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    const provider = injectedProvider();
    if (!provider) {
      const ready = setTimeout(() => setState({ ...initial, ready: true }), 0);
      return () => clearTimeout(ready);
    }
    let alive = true;
    const readChain = async () => {
      const hex = (await provider.request({ method: "eth_chainId" })) as string;
      return Number(BigInt(hex));
    };
    const apply = (accounts: string[], chainId: number | null) => {
      if (!alive) return;
      const account = accounts.find((a) => isAddress(a)) as Address | undefined;
      setState({
        account: account ?? null,
        provider: account ? provider : null,
        chainId,
        ready: true,
        error: null,
        connecting: false,
      });
    };
    const resume = async () => {
      let remembered = false;
      try {
        remembered = localStorage.getItem(STORAGE_KEY) === "1";
      } catch {}
      if (!remembered) {
        apply([], null);
        return;
      }
      try {
        const [accounts, chainId] = await Promise.all([
          provider.request({ method: "eth_accounts" }) as Promise<string[]>,
          readChain(),
        ]);
        apply(accounts, chainId);
      } catch {
        apply([], null);
      }
    };
    const onAccounts = (accounts: unknown) => {
      readChain().then((chainId) => apply(accounts as string[], chainId)).catch(() => apply(accounts as string[], null));
    };
    const onChain = (hex: unknown) => {
      if (!alive) return;
      setState((s) => ({ ...s, chainId: Number(BigInt(hex as string)) }));
    };
    resume();
    provider.on("accountsChanged", onAccounts);
    provider.on("chainChanged", onChain);
    return () => {
      alive = false;
      provider.removeListener("accountsChanged", onAccounts);
      provider.removeListener("chainChanged", onChain);
    };
  }, []);

  const open = useCallback(async () => {
    if (state.account) {
      setAccountOpen(true);
      return;
    }
    const provider = injectedProvider();
    if (!provider) {
      setState((s) => ({
        ...s,
        ready: true,
        error: "No browser wallet was found. Install a wallet extension, or configure a Reown project id for WalletConnect.",
      }));
      return;
    }
    setState((s) => ({ ...s, connecting: true, error: null }));
    try {
      const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
      const hex = (await provider.request({ method: "eth_chainId" })) as string;
      const account = accounts.find((a) => isAddress(a)) as Address | undefined;
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {}
      setState({
        account: account ?? null,
        provider: account ? provider : null,
        chainId: Number(BigInt(hex)),
        ready: true,
        error: null,
        connecting: false,
      });
    } catch {
      setState((s) => ({ ...s, connecting: false, error: "Wallet connection was rejected." }));
    }
  }, [state.account]);

  const disconnect = useCallback(async () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setAccountOpen(false);
    setState({ ...initial, ready: true });
  }, []);

  const switchNetwork = useCallback(async () => {
    const provider = injectedProvider();
    if (!provider) return;
    const hexId = `0x${chain.id.toString(16)}`;
    try {
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexId }] });
    } catch (error) {
      const code = (error as { code?: number })?.code;
      if (code === 4902) {
        try {
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: hexId,
                chainName: chain.name,
                nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
                rpcUrls: ["https://rpc.mainnet.chain.robinhood.com"],
                blockExplorerUrls: [chain.explorer],
              },
            ],
          });
          return;
        } catch {}
      }
      setState((s) => ({ ...s, error: "Switch to Robinhood Chain in your wallet to continue." }));
    }
  }, []);

  const value = useMemo(() => ({ ...state, open, disconnect, switchNetwork }), [state, open, disconnect, switchNetwork]);
  return (
    <WalletContext.Provider value={value}>
      {children}
      <Dialog open={accountOpen} onOpenChange={setAccountOpen}>
        <DialogContent className="account-dialog">
          <DialogTitle>Connected wallet</DialogTitle>
          <DialogDescription>
            This browser wallet is connected to {chain.name === "Robinhood Chain" && state.chainId === chain.id ? "Robinhood Chain" : `chain ${state.chainId ?? "—"}`}.
          </DialogDescription>
          {state.account && (
            <dl className="detail-rows">
              <div>
                <dt>Address</dt>
                <dd className="address-row">
                  <a href={explorerAddress(state.account)} target="_blank" rel="noopener noreferrer">
                    {state.account}
                  </a>
                </dd>
              </div>
            </dl>
          )}
          <button className="button secondary" onClick={() => void disconnect()}>
            Disconnect
          </button>
        </DialogContent>
      </Dialog>
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error("Wallet provider missing");
  return context;
}
