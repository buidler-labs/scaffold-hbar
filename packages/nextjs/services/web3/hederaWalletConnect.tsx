"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getHederaProvider, initAppKit } from "./appKitHedera";
import type { HederaProvider } from "@hashgraph/hedera-wallet-connect";
import { hederaNamespace } from "@hashgraph/hedera-wallet-connect";
import { useAppKitAccount, useDisconnect } from "@reown/appkit/react";

type HederaWalletConnectContextValue = {
  provider: HederaProvider | null;
  accountId: string | null;
  isConnected: boolean;
  isInitializing: boolean;
  isBusy: boolean;
  prepareConnect: () => void;
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
  const { address, isConnected } = useAppKitAccount({ namespace: hederaNamespace });

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

  const connectWallet = async () => {
    // Connect is triggered from custom UI via AppKit modal open().
    return Promise.resolve();
  };

  const prepareConnect = () => {
    setForceDisconnected(false);
  };

  const disconnectWallet = async () => {
    if (isBusy) return;
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
      setForceDisconnected(true);
    } finally {
      setIsBusy(false);
    }
  };

  const accountId = !forceDisconnected && isConnected && address ? address : null;

  useEffect(() => {
    if (isConnected && address) {
      setForceDisconnected(false);
    }
  }, [isConnected, address]);

  const value = useMemo<HederaWalletConnectContextValue>(
    () => ({
      provider,
      accountId,
      isConnected: Boolean(accountId),
      isInitializing,
      isBusy,
      prepareConnect,
      connectWallet,
      disconnectWallet,
    }),
    [provider, accountId, isInitializing, isBusy],
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
