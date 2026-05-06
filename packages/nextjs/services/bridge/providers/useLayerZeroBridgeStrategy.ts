"use client";

import { useCallback } from "react";
import type { BridgeProviderStrategy, BridgeRoute } from "../types";
import type { Hash } from "viem";

type UseLayerZeroBridgeStrategyArgs = {
  route: BridgeRoute;
};

export const useLayerZeroBridgeStrategy = ({ route }: UseLayerZeroBridgeStrategyArgs): BridgeProviderStrategy => {
  const approveNext = useCallback(async (): Promise<Hash | undefined> => undefined, []);
  const reset = useCallback(() => undefined, []);

  return {
    providerId: "layerzero",
    quote: {
      status: route.providerId === "layerzero" ? "unsupported" : "idle",
      reason: "LayerZero bridge flow is not implemented yet.",
    },
    approvals: {
      approveNext,
      isApproving: false,
      nextStep: undefined,
      status: route.providerId === "layerzero" ? "unsupported" : "idle",
      steps: [],
    },
    tokenAccount: {
      destinationToken: undefined,
      showHtsAssociationNotice: false,
      sourceToken: undefined,
      status: "idle",
    },
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
