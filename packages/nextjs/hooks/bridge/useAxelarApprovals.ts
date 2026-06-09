"use client";

import { useMemo } from "react";
import { useTokenApprovals } from "./useTokenApprovals";
import type { Address } from "viem";
import { usePublicClient } from "wagmi";
import type { BridgeRoute } from "~~/services/bridge";
import type { BridgeApprovalStatus, BridgeApprovalStep } from "~~/services/bridge";
import { HEDERA_TESTNET_CHAIN_ID } from "~~/services/bridge/constants";

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
      label: "Approve Axelar spender",
      tokenAddress: route.axelar.sourceTokenAddress,
      spenderAddress: route.axelar.sourceApprovalSpenderAddress ?? route.axelar.interchainTokenServiceAddress,
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
