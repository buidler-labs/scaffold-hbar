"use client";

import type { BridgeProviderStrategy, BridgeReadinessStatus, BridgeRoute } from "../types";
import { useLayerZeroApprovals } from "../useLayerZeroApprovals";
import { useLayerZeroQuote } from "../useLayerZeroQuote";
import { useLayerZeroSend } from "../useLayerZeroSend";
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
  const send = useLayerZeroSend({
    enabled: enabled && isReady && approvals.status === "approvals_ready",
    quote,
    recipient: address,
    route,
    sender: address,
  });
  const canSend = approvals.status === "approvals_ready" && quote.status === "quoted" && send.status !== "submitted";

  return {
    providerId: "layerzero",
    quote,
    approvals,
    tokenAccount,
    submission: {
      canSend,
      followUpCommand: send.followUpCommand,
      isSending: send.isSending,
      reset: send.reset,
      sendTransfer: canSend ? send.sendLayerZero : undefined,
      status: send.status,
      submittedHash: send.submittedHash,
    },
    resetSubmission: send.reset,
  };
};
