"use client";

import { useMemo } from "react";
import { HEDERA_TESTNET_CHAIN_ID } from "./constants";
import type { BridgeRoute } from "./types";
import type { BridgeApprovalStatus, BridgeApprovalStep } from "./useTokenApprovals";
import { useTokenApprovals } from "./useTokenApprovals";
import type { Address } from "viem";
import { usePublicClient } from "wagmi";

export type CcipApprovalStatus = BridgeApprovalStatus;

export type CcipApprovalStep = BridgeApprovalStep & {
  id: "hts-wrapper" | "router";
};

type UseCcipApprovalsArgs = {
  amountInBaseUnits?: bigint;
  enabled: boolean;
  owner?: Address;
  route: BridgeRoute;
};

const getCcipApprovalSteps = (route: BridgeRoute, amountInBaseUnits: bigint): CcipApprovalStep[] => {
  if (!route.ccip) return [];

  if (route.sourceChainId === HEDERA_TESTNET_CHAIN_ID) {
    if (!route.ccip.sourceHtsTokenAddress) return [];

    return [
      {
        id: "hts-wrapper",
        label: "Approve HTS token",
        tokenAddress: route.ccip.sourceHtsTokenAddress,
        spenderAddress: route.ccip.sourceTokenAddress,
        isApproved: false,
      },
      {
        id: "router",
        label: "Approve router",
        tokenAddress: route.ccip.sourceTokenAddress,
        spenderAddress: route.ccip.sourceRouterAddress,
        isApproved: false,
      },
    ];
  }

  return [
    {
      id: "router",
      label: "Approve router",
      tokenAddress: route.ccip.sourceTokenAddress,
      spenderAddress: route.ccip.sourceRouterAddress,
      isApproved: false,
    },
  ];
};

export const useCcipApprovals = ({ amountInBaseUnits, enabled, owner, route }: UseCcipApprovalsArgs) => {
  const sourceClient = usePublicClient({ chainId: route.sourceChainId });
  const approvalSteps = useMemo(
    () => (amountInBaseUnits ? getCcipApprovalSteps(route, amountInBaseUnits) : []),
    [amountInBaseUnits, route],
  );

  return useTokenApprovals({
    amountInBaseUnits,
    enabled,
    missingConfig: !route.ccip || approvalSteps.length === 0,
    owner,
    sourceChainId: route.sourceChainId,
    sourceClient,
    steps: approvalSteps,
    unsupported: route.providerId !== "ccip",
  });
};
