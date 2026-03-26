"use client";

import { useHederaWalletConnect } from "~~/services/web3/hederaWalletConnect";

export function useHederaSigner() {
  const { provider, accountId, isConnected, isInitializing } = useHederaWalletConnect();

  const requireProvider = () => {
    if (!provider || !isConnected || !accountId) {
      throw new Error("Connect a Hedera wallet first");
    }
    return { provider, accountId };
  };

  return { provider, accountId, isConnected, isInitializing, requireProvider };
}
