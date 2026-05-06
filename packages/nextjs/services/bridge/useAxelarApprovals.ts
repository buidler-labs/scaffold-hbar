"use client";

import { useMemo } from "react";
import { HEDERA_TESTNET_CHAIN_ID } from "./constants";
import type { BridgeRoute } from "./types";
import type { BridgeApprovalStatus, BridgeApprovalStep } from "./useTokenApprovals";
import { useTokenApprovals } from "./useTokenApprovals";
import type { Address } from "viem";
import { usePublicClient } from "wagmi";

export type AxelarApprovalStatus = BridgeApprovalStatus;

export type AxelarApprovalStep = BridgeApprovalStep & {
  id: "its";
};

type UseAxelarApprovalsArgs = {
  amountInBaseUnits?: bigint;
  enabled: boolean;
  owner?: Address;
  route: BridgeRoute;
};

const getAxelarApprovalSteps = (route: BridgeRoute): AxelarApprovalStep[] => {
  if (!route.axelar || route.sourceChainId !== HEDERA_TESTNET_CHAIN_ID) return [];

  return [
    {
      id: "its",
      label: "Approve ITS",
      tokenAddress: route.axelar.sourceTokenAddress,
      spenderAddress: route.axelar.interchainTokenServiceAddress,
      isApproved: false,
    },
  ];
};

export const useAxelarApprovals = ({ amountInBaseUnits, enabled, owner, route }: UseAxelarApprovalsArgs) => {
  const sourceClient = usePublicClient({ chainId: route.sourceChainId });
  const approvalSteps = useMemo(
    () => (amountInBaseUnits ? getAxelarApprovalSteps(route) : []),
    [amountInBaseUnits, route],
  );

  return useTokenApprovals({
    amountInBaseUnits,
    enabled,
    missingConfig: !route.axelar,
    owner,
    sourceChainId: route.sourceChainId,
    sourceClient,
    steps: approvalSteps,
    unsupported: route.providerId !== "axelar",
  });
};
