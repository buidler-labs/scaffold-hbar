"use client";

import { useCcipApprovals } from "../useCcipApprovals";
import { useCcipQuote } from "../useCcipQuote";
import { useCcipSend } from "../useCcipSend";
import { useCcipTokenAccount } from "../useCcipTokenAccount";
import type { Address } from "viem";
import type { BridgeProviderStrategy, BridgeReadinessStatus, BridgeRoute } from "~~/services/bridge";

type UseCcipBridgeStrategyArgs = {
  address?: Address;
  amount: string;
  enabled: boolean;
  isConnected: boolean;
  readinessStatus: BridgeReadinessStatus;
  route: BridgeRoute;
};

export const useCcipBridgeStrategy = ({
  address,
  amount,
  enabled,
  isConnected,
  readinessStatus,
  route,
}: UseCcipBridgeStrategyArgs): BridgeProviderStrategy => {
  const isReady = isConnected && readinessStatus === "ready";
  const quote = useCcipQuote({
    amount,
    enabled: enabled && isReady,
    recipient: address,
    route,
  });
  const tokenAccount = useCcipTokenAccount({
    account: address,
    enabled: enabled && isConnected,
    route,
  });
  const approvals = useCcipApprovals({
    amountInBaseUnits: quote.status === "quoted" ? quote.amountInBaseUnits : undefined,
    enabled: enabled && isReady,
    owner: address,
    route,
  });
  const send = useCcipSend({
    enabled: enabled && isReady && approvals.status === "approvals_ready",
    quote,
    recipient: address,
    route,
    sender: address,
  });
  const canSend = approvals.status === "approvals_ready" && quote.status === "quoted" && send.status !== "submitted";

  return {
    providerId: "ccip",
    quote,
    approvals,
    tokenAccount,
    submission: {
      canSend,
      isSending: send.isSending,
      reset: send.reset,
      sendTransfer: canSend ? send.sendCcip : undefined,
      status: send.status,
      submittedHash: send.submittedHash,
    },
    resetSubmission: send.reset,
  };
};
