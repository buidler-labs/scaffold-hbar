"use client";

import { useEffect } from "react";
import { hederaTestnet } from "viem/chains";
import { useSwitchChain } from "wagmi";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useLocalChainConnectionError } from "~~/hooks/scaffold-hbar/useLocalChainConnectionError";

/**
 * Shows a banner when the user is on the local fork chain but yarn foundry:chain is not running.
 * Auto-switches to Testnet when the error is detected (e.g. MetaMask connected on local fork).
 */
export const LocalChainErrorBanner = () => {
  const hasError = useLocalChainConnectionError();
  const { switchChain } = useSwitchChain();

  useEffect(() => {
    if (hasError && switchChain) {
      switchChain({ chainId: hederaTestnet.id });
    }
  }, [hasError, switchChain]);

  if (!hasError) return null;

  return (
    <div className="bg-error/10 border-b border-error/20 px-4 py-2 flex items-center justify-center gap-2 text-error">
      <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
      <p className="text-sm font-medium m-0">
        Cannot connect to local node. Run <code className="bg-error/20 px-1.5 py-0.5 rounded">yarn foundry:chain</code>{" "}
        in a terminal or switch to Testnet/Mainnet.
      </p>
    </div>
  );
};
