"use client";

import { type ReactNode, useEffect, useRef } from "react";
import type { Transaction } from "@hiero-ledger/sdk";
import { CapabilityError, setNativeTransactionSigner } from "@scaffold-hbar-ui/hooks";
import { useHederaWalletConnect } from "~~/services/web3/hederaWalletConnect";
import { hederaCaipId } from "~~/utils/scaffold-hbar/hederaIdentity";
import { transactionToBase64String } from "~~/utils/scaffold-hbar/hederaTxUtils";

/**
 * Registers scaffold-hbar-ui's native transaction signer with the current Hedera WalletConnect
 * session. Refs keep the signer closure stable while always seeing the latest provider/account.
 */
export function NativeTransactionSignerBridge({ children }: { children: ReactNode }) {
  const { provider, accountId } = useHederaWalletConnect();
  const providerRef = useRef(provider);
  const accountIdRef = useRef(accountId);
  providerRef.current = provider;
  accountIdRef.current = accountId;

  useEffect(() => {
    setNativeTransactionSigner(async tx => {
      const p = providerRef.current;
      const acc = accountIdRef.current;
      if (!p || !acc) {
        throw new CapabilityError();
      }
      const result = await p.hedera_signAndExecuteTransaction({
        signerAccountId: hederaCaipId(acc),
        transactionList: transactionToBase64String(tx as Transaction),
      });
      if (!result?.transactionId) {
        throw new Error("No transactionId returned from wallet");
      }
      return { transactionId: result.transactionId };
    });
    return () => {
      setNativeTransactionSigner(undefined);
    };
  }, []);

  return <>{children}</>;
}
