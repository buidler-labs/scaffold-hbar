"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getHederaProvider, initAppKit } from "./appKitHedera";
import type { HederaProvider } from "@hashgraph/hedera-wallet-connect";
import { hederaNamespace } from "@hashgraph/hedera-wallet-connect";
import { useAppKitAccount } from "@reown/appkit/react";

type HederaWalletConnectContextValue = {
  provider: HederaProvider | null;
  accountId: string | null;
  isConnected: boolean;
  isInitializing: boolean;
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
  const [provider, setProvider] = useState<HederaProvider | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [forceDisconnected, setForceDisconnected] = useState(false);

  useEffect(() => {
    let mounted = true;
    ensureInit()
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

  const { address, isConnected } = useAppKitAccount({ namespace: hederaNamespace });

  useEffect(() => {
    const onManualDisconnect = () => {
      setForceDisconnected(true);
    };
    window.addEventListener("hedera-wallet-disconnected", onManualDisconnect);
    return () => window.removeEventListener("hedera-wallet-disconnected", onManualDisconnect);
  }, []);

  useEffect(() => {
    if (isConnected && address) {
      setForceDisconnected(false);
    }
  }, [isConnected, address]);

  const effectiveIsConnected = !forceDisconnected && isConnected && Boolean(address);

  const value = useMemo<HederaWalletConnectContextValue>(
    () => ({
      provider,
      accountId: effectiveIsConnected ? (address ?? null) : null,
      isConnected: effectiveIsConnected,
      isInitializing,
    }),
    [provider, address, effectiveIsConnected, isInitializing],
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
