"use client";

import { useAxelarApprovals } from "../useAxelarApprovals";
import { useAxelarQuote } from "../useAxelarQuote";
import { useAxelarSend } from "../useAxelarSend";
import { useAxelarTokenAccount } from "../useAxelarTokenAccount";
import type { Address } from "viem";
import type { BridgeProviderStrategy, BridgeReadinessStatus, BridgeRoute } from "~~/services/bridge";

type UseAxelarBridgeStrategyArgs = {
  address?: Address;
  amount: string;
  enabled: boolean;
  isConnected: boolean;
  readinessStatus: BridgeReadinessStatus;
  route: BridgeRoute;
};

export const useAxelarBridgeStrategy = ({
  address,
  amount,
  enabled,
  isConnected,
  readinessStatus,
  route,
}: UseAxelarBridgeStrategyArgs): BridgeProviderStrategy => {
  const isReady = isConnected && readinessStatus === "ready";
  const quote = useAxelarQuote({
    amount,
    enabled: enabled && isReady,
    route,
  });
  const tokenAccount = useAxelarTokenAccount({
    account: address,
    enabled: enabled && isConnected,
    route,
  });
  const approvals = useAxelarApprovals({
    amountInBaseUnits: quote.status === "quoted" ? quote.amountInBaseUnits : undefined,
    enabled: enabled && isReady,
    owner: address,
    route,
  });
  const send = useAxelarSend({
    enabled: enabled && isReady && approvals.status === "approvals_ready",
    quote,
    recipient: address,
    route,
    sender: address,
  });
  const canSend = approvals.status === "approvals_ready" && quote.status === "quoted" && send.status !== "submitted";

  return {
    providerId: "axelar",
    quote,
    approvals,
    tokenAccount,
    submission: {
      canSend,
      isSending: send.isSending,
      reset: send.reset,
      sendTransfer: canSend ? send.sendAxelar : undefined,
      status: send.status,
      submittedHash: send.submittedHash,
    },
    resetSubmission: send.reset,
  };
};
