"use client";

import { hederaNamespace } from "@hashgraph/hedera-wallet-connect";
import { useAppKit, useDisconnect } from "@reown/appkit/react";
import { useHederaWalletConnect } from "~~/services/web3/hederaWalletConnect";

/**
 * Reown AppKit connect button.
 */
export const AppKitConnectButton = () => {
  const { open } = useAppKit();
  const { disconnect } = useDisconnect();
  const { provider, accountId, isConnected } = useHederaWalletConnect();

  const clearWalletSessionStorage = () => {
    if (typeof window === "undefined") return;
    const keysToRemove = Object.keys(window.localStorage).filter(key => {
      const lower = key.toLowerCase();
      return (
        lower.includes("walletconnect") || lower.includes("w3m") || lower.includes("appkit") || lower.includes("wc@2")
      );
    });
    keysToRemove.forEach(key => window.localStorage.removeItem(key));
  };

  const handleDisconnect = async () => {
    let disconnected = false;

    try {
      // Disconnect the specific Hedera namespace session first.
      await disconnect({ namespace: hederaNamespace });
      disconnected = true;
    } catch (error) {
      console.warn("Namespace disconnect failed, trying global disconnect", error);
    }

    try {
      // Also disconnect any globally tracked AppKit session.
      await disconnect();
      disconnected = true;
    } catch (error) {
      console.warn("Global AppKit disconnect failed, trying provider disconnect", error);
    }

    try {
      // Force-close WalletConnect sessions on the Hedera provider.
      await provider?.disconnect();
      disconnected = true;
    } catch (error) {
      console.warn("Provider disconnect failed", error);
    }

    // Ensure AppKit dropdown/modal doesn't show stale connected data.
    clearWalletSessionStorage();
    window.dispatchEvent(new Event("hedera-wallet-disconnected"));

    if (!disconnected) {
      window.location.reload();
    }
  };

  if (!isConnected) {
    return (
      <button
        className="btn btn-primary btn-sm"
        onClick={() => void open({ view: "Connect", namespace: hederaNamespace })}
        type="button"
      >
        Connect
      </button>
    );
  }

  const short = accountId ? `${accountId.slice(0, 6)}...${accountId.slice(-4)}` : "Connected";

  return (
    <div className="flex items-center gap-2">
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => void open({ view: "Account", namespace: hederaNamespace })}
        type="button"
      >
        {short}
      </button>
      <button className="btn btn-outline btn-sm" onClick={() => void handleDisconnect()} type="button">
        Disconnect
      </button>
    </div>
  );
};

// Backward-compatible alias while migrating imports.
export const RainbowKitCustomConnectButton = AppKitConnectButton;
