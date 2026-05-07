"use client";

import { useCallback } from "react";
import type { BridgeProviderStrategy, BridgeReadinessStatus, BridgeRoute } from "../types";
import { useLayerZeroApprovals } from "../useLayerZeroApprovals";
import { useLayerZeroQuote } from "../useLayerZeroQuote";
import { useLayerZeroTokenAccount } from "../useLayerZeroTokenAccount";
import type { Address } from "viem";

type UseLayerZeroBridgeStrategyArgs = {
  address?: Address;
  amount: string;
  enabled: boolean;
  isConnected: boolean;
  readinessStatus: BridgeReadinessStatus;
  route: BridgeRoute;
};

export const useLayerZeroBridgeStrategy = ({
  address,
  amount,
  enabled,
  isConnected,
  readinessStatus,
  route,
}: UseLayerZeroBridgeStrategyArgs): BridgeProviderStrategy => {
  const reset = useCallback(() => undefined, []);
  const isReady = isConnected && readinessStatus === "ready";
  const quote = useLayerZeroQuote({
    amount,
    enabled: enabled && isReady,
    recipient: address,
    route,
  });
  const tokenAccount = useLayerZeroTokenAccount({
    account: address,
    enabled: enabled && isConnected,
    route,
  });
  const approvals = useLayerZeroApprovals({
    amountInBaseUnits: quote.status === "quoted" ? quote.amountInBaseUnits : undefined,
    enabled: enabled && isReady,
    owner: address,
    route,
  });

  return {
    providerId: "layerzero",
    quote,
    approvals,
    tokenAccount,
    submission: {
      canSend: false,
      isSending: false,
      reset,
      sendTransfer: undefined,
      status: "idle",
      submittedHash: undefined,
    },
    resetSubmission: reset,
  };
};
