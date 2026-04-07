"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { clearWalletStorage, getHederaProvider, initAppKit, resetAppKitSession } from "./appKitHedera";
import type { HederaProvider } from "@hashgraph/hedera-wallet-connect";
import { hederaNamespace } from "@hashgraph/hedera-wallet-connect";
import { useAppKitAccount, useDisconnect } from "@reown/appkit/react";

type HederaWalletConnectContextValue = {
  provider: HederaProvider | null;
  accountId: string | null;
  isConnected: boolean;
  isInitializing: boolean;
  isBusy: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
};

const HederaWalletConnectContext = createContext<HederaWalletConnectContextValue | undefined>(undefined);

// Module-level promise so init runs once and is shared across hot reloads in dev.
let _initPromise: Promise<HederaProvider> | null = null;

function ensureInit(): Promise<HederaProvider> {
  if (!_initPromise) {
    _initPromise = initAppKit().then(() => getHederaProvider());
  }
  return _initPromise;
}

export const HederaWalletConnectProvider = ({ children }: { children: React.ReactNode }) => {
  const { disconnect } = useDisconnect();
  const [provider, setProvider] = useState<HederaProvider | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [forceDisconnected, setForceDisconnected] = useState(false);
  // Incremented whenever the WC session changes so React re-evaluates
  // providerHasSession without relying on object-mutation detection.
  const [sessionTick, setSessionTick] = useState(0);
  const { address, isConnected } = useAppKitAccount({ namespace: hederaNamespace });
  const prevAddressRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void ensureInit()
      .then(hp => {
        if (mounted) setProvider(hp);
      })
      .catch(err => console.error("HederaWalletConnect init failed", err))
      .finally(() => {
        if (mounted) setIsInitializing(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // When the provider reference changes, subscribe to WalletConnect session
  // events so React re-renders when session is established or deleted. Without
  // this the providerHasSession check would be stuck on the value captured at
  // render time because provider.session is mutated externally by the WC lib.
  useEffect(() => {
    if (!provider) return;
    const bump = () => setSessionTick(t => t + 1);
    const p = provider as unknown as {
      on?: (event: string, cb: () => void) => void;
      off?: (event: string, cb: () => void) => void;
    };
    if (typeof p.on === "function") {
      p.on("session_update", bump);
      p.on("session_delete", bump);
      p.on("connect", bump);
      p.on("disconnect", bump);
    }
    return () => {
      if (typeof p.off === "function") {
        p.off("session_update", bump);
        p.off("session_delete", bump);
        p.off("connect", bump);
        p.off("disconnect", bump);
      }
    };
  }, [provider]);

  const connectWallet = useCallback(async () => {
    // Connect is triggered from custom UI via AppKit modal open().
    return Promise.resolve();
  }, []);

  const disconnectWallet = useCallback(async () => {
    if (isBusy) return;
    const addressWhenDisconnecting = address;
    setIsBusy(true);
    try {
      try {
        await disconnect({ namespace: hederaNamespace });
      } catch {
        // Continue to global disconnect fallback.
      }
      try {
        await disconnect();
      } catch {
        // Continue to provider-level fallback.
      }
      const p = provider as unknown as {
        disconnect?: (params?: unknown) => Promise<unknown>;
      };
      if (typeof p.disconnect === "function") {
        try {
          await p.disconnect({ namespace: hederaNamespace });
        } catch {
          try {
            await p.disconnect();
          } catch (error) {
            // Some providers throw here when no session was ever fully enabled.
            console.warn("Provider disconnect fallback failed", error);
          }
        }
      }

      clearWalletStorage();
      await resetAppKitSession();
      _initPromise = null;
      // Keep last account on the ref so a stale isConnected+sameAddress frame cannot clear forceDisconnected.
      prevAddressRef.current = addressWhenDisconnecting ?? null;
      setForceDisconnected(true);

      // Await re-init so isBusy stays true (and the UI stays blocked) until
      // the provider is fully ready. Fire-and-forgetting this was the cause of
      // a race where AppKit reported "connected" while provider was still null.
      try {
        const hp = await ensureInit();
        setProvider(hp);
      } catch (err) {
        console.error("HederaWalletConnect re-init after disconnect failed", err);
      }
    } finally {
      setIsBusy(false);
    }
  }, [isBusy, address, disconnect, provider]);

  // provider.session is the WalletConnect session object set by the library
  // after a successful connect(). AppKit can report isConnected=true before
  // the session is available (e.g. on page refresh while the provider is still
  // initialising, or in the brief window after reconnect). We only expose a
  // non-null accountId when the provider session is confirmed to be live.
  // sessionTick is read here to force React to re-evaluate after WC events.
  const providerHasSession = Boolean(
    sessionTick >= 0 && provider && (provider as unknown as { session?: unknown }).session,
  );
  const accountId = !forceDisconnected && isConnected && address && providerHasSession ? address : null;

  useEffect(() => {
    if (isConnected && address) {
      if (forceDisconnected && address === prevAddressRef.current) {
        return;
      }
      if (forceDisconnected) {
        setForceDisconnected(false);
      }
      prevAddressRef.current = address;
      return;
    }
    if (!isConnected) {
      prevAddressRef.current = null;
    }
  }, [isConnected, address, forceDisconnected]);

  const value = useMemo<HederaWalletConnectContextValue>(
    () => ({
      provider,
      accountId,
      isConnected: Boolean(accountId),
      isInitializing,
      isBusy,
      connectWallet,
      disconnectWallet,
    }),
    [provider, accountId, isInitializing, isBusy, connectWallet, disconnectWallet],
  );

  // Don't render children until AppKit + HederaProvider are ready.
  // This prevents the <appkit-button> from opening the modal before the
  // hedera namespace adapter is registered.
  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="loading loading-spinner loading-md text-primary" />
      </div>
    );
  }

  return <HederaWalletConnectContext.Provider value={value}>{children}</HederaWalletConnectContext.Provider>;
};

export const useHederaWalletConnect = () => {
  const ctx = useContext(HederaWalletConnectContext);
  if (!ctx) throw new Error("useHederaWalletConnect must be used inside HederaWalletConnectProvider");
  return ctx;
};
