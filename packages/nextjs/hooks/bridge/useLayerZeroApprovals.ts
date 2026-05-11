"use client";

import { useMemo } from "react";
import { useTokenApprovals } from "./useTokenApprovals";
import type { Address } from "viem";
import { usePublicClient, useReadContract } from "wagmi";
import type { BridgeRoute } from "~~/services/bridge";
import type { BridgeApprovalStatus, BridgeApprovalStep } from "~~/services/bridge";
import { layerZeroOftAbi } from "~~/services/bridge/layerzeroAbi";

export type LayerZeroApprovalStatus = BridgeApprovalStatus;

export type LayerZeroApprovalStep = BridgeApprovalStep & {
  id: "oft";
};

type UseLayerZeroApprovalsArgs = {
  amountInBaseUnits?: bigint;
  enabled: boolean;
  owner?: Address;
  route: BridgeRoute;
};

const getLayerZeroApprovalSteps = (
  route: BridgeRoute,
  approvalRequired: boolean | undefined,
): LayerZeroApprovalStep[] => {
  if (!route.layerzero || !approvalRequired) return [];

  return [
    {
      id: "oft",
      label: "Approve OFT",
      tokenAddress: route.layerzero.sourceTokenAddress,
      spenderAddress: route.layerzero.sourceOftAddress,
      isApproved: false,
    },
  ];
};

export const useLayerZeroApprovals = ({ amountInBaseUnits, enabled, owner, route }: UseLayerZeroApprovalsArgs) => {
  const sourceClient = usePublicClient({ chainId: route.sourceChainId });
  const approvalRequiredQuery = useReadContract({
    address: route.layerzero?.sourceOftAddress,
    abi: layerZeroOftAbi,
    functionName: "approvalRequired",
    chainId: route.sourceChainId,
    query: {
      enabled: Boolean(enabled && route.providerId === "layerzero" && route.layerzero && amountInBaseUnits),
      staleTime: 60_000,
    },
  });
  const approvalSteps = useMemo(
    () => (amountInBaseUnits ? getLayerZeroApprovalSteps(route, approvalRequiredQuery.data) : []),
    [amountInBaseUnits, approvalRequiredQuery.data, route],
  );

  const approvals = useTokenApprovals({
    amountInBaseUnits,
    enabled,
    missingConfig: !route.layerzero,
    owner,
    sourceChainId: route.sourceChainId,
    sourceClient,
    steps: approvalSteps,
    unsupported: route.providerId !== "layerzero",
  });

  if (enabled && amountInBaseUnits && route.providerId === "layerzero" && route.layerzero) {
    if (approvalRequiredQuery.isLoading || approvalRequiredQuery.isFetching) {
      return {
        ...approvals,
        status: "checking" as const,
      };
    }

    if (approvalRequiredQuery.isError) {
      return {
        ...approvals,
        status: "failed" as const,
      };
    }
  }

  return approvals;
};
