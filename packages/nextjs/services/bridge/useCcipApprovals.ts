"use client";

import { useCallback, useMemo, useState } from "react";
import { erc20BridgeAbi } from "./ccipAbi";
import { HEDERA_TESTNET_CHAIN_ID } from "./constants";
import type { BridgeRoute } from "./types";
import type { Address, Hash } from "viem";
import { usePublicClient, useReadContracts, useWriteContract } from "wagmi";
import { notification } from "~~/utils/scaffold-hbar";

export type CcipApprovalStatus =
  | "idle"
  | "unsupported"
  | "missing_config"
  | "checking"
  | "needs_approval"
  | "approving"
  | "approvals_ready"
  | "failed";

export type CcipApprovalStep = {
  id: "hts-wrapper" | "router";
  label: string;
  tokenAddress: Address;
  spenderAddress: Address;
  allowance?: bigint;
  isApproved: boolean;
};

type UseCcipApprovalsArgs = {
  amountInBaseUnits?: bigint;
  enabled: boolean;
  owner?: Address;
  route: BridgeRoute;
};

const getApprovalErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.includes("TOKEN_NOT_ASSOCIATED_TO_ACCOUNT")) {
    return "Associate this Hedera account with the HTS token before approving it.";
  }

  return error instanceof Error ? error.message : fallback;
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
  const { writeContractAsync } = useWriteContract();
  const [approvingStepId, setApprovingStepId] = useState<CcipApprovalStep["id"] | undefined>();
  const approvalSteps = useMemo(
    () => (amountInBaseUnits ? getCcipApprovalSteps(route, amountInBaseUnits) : []),
    [amountInBaseUnits, route],
  );
  const shouldCheckAllowances = Boolean(
    enabled && route.providerId === "ccip" && route.ccip && sourceClient && owner && amountInBaseUnits,
  );

  const allowanceQuery = useReadContracts({
    contracts: approvalSteps.map(step => ({
      address: step.tokenAddress,
      abi: erc20BridgeAbi,
      functionName: "allowance",
      args: [owner as Address, step.spenderAddress],
      chainId: route.sourceChainId,
    })),
    query: {
      enabled: shouldCheckAllowances && approvalSteps.length > 0,
      staleTime: 10_000,
    },
  });

  const steps = useMemo(
    () =>
      approvalSteps.map((step, index) => {
        const allowance = allowanceQuery.data?.[index]?.result;
        const normalizedAllowance = typeof allowance === "bigint" ? allowance : undefined;

        return {
          ...step,
          allowance: normalizedAllowance,
          isApproved: Boolean(
            amountInBaseUnits && normalizedAllowance !== undefined && normalizedAllowance >= amountInBaseUnits,
          ),
        };
      }),
    [allowanceQuery.data, amountInBaseUnits, approvalSteps],
  );
  const nextStep = steps.find(step => !step.isApproved);
  const isApproving = Boolean(approvingStepId);

  const approveNext = useCallback(async () => {
    if (!amountInBaseUnits || !nextStep || !sourceClient) return undefined;

    let notificationId: string | undefined;
    setApprovingStepId(nextStep.id);

    try {
      notificationId = notification.loading(`${nextStep.label}: waiting for wallet confirmation.`);
      const hash = await writeContractAsync({
        address: nextStep.tokenAddress,
        abi: erc20BridgeAbi,
        functionName: "approve",
        args: [nextStep.spenderAddress, amountInBaseUnits],
        chainId: route.sourceChainId,
      });

      notification.remove(notificationId);
      notificationId = notification.loading(`${nextStep.label}: waiting for confirmation.`);

      await sourceClient.waitForTransactionReceipt({ hash });
      notification.remove(notificationId);
      notification.success(`${nextStep.label} confirmed.`);
      await allowanceQuery.refetch();

      return hash;
    } catch (error) {
      if (notificationId) notification.remove(notificationId);
      notification.error(getApprovalErrorMessage(error, `${nextStep.label} failed.`));
      throw error;
    } finally {
      setApprovingStepId(undefined);
    }
  }, [allowanceQuery, amountInBaseUnits, nextStep, route.sourceChainId, sourceClient, writeContractAsync]);

  if (!enabled || !amountInBaseUnits) {
    return {
      approveNext,
      isApproving,
      nextStep,
      steps,
      status: "idle" as const,
      submittedHash: undefined as Hash | undefined,
    };
  }

  if (route.providerId !== "ccip") {
    return {
      approveNext,
      isApproving,
      nextStep,
      steps,
      status: "unsupported" as const,
      submittedHash: undefined as Hash | undefined,
    };
  }

  if (!route.ccip || steps.length === 0) {
    return {
      approveNext,
      isApproving,
      nextStep,
      steps,
      status: "missing_config" as const,
      submittedHash: undefined as Hash | undefined,
    };
  }

  if (isApproving) {
    return {
      approveNext,
      isApproving,
      nextStep: steps.find(step => step.id === approvingStepId) ?? nextStep,
      steps,
      status: "approving" as const,
      submittedHash: undefined as Hash | undefined,
    };
  }

  if (allowanceQuery.isLoading || allowanceQuery.isFetching) {
    return {
      approveNext,
      isApproving,
      nextStep,
      steps,
      status: "checking" as const,
      submittedHash: undefined as Hash | undefined,
    };
  }

  if (allowanceQuery.isError) {
    return {
      approveNext,
      isApproving,
      nextStep,
      steps,
      status: "failed" as const,
      submittedHash: undefined as Hash | undefined,
    };
  }

  return {
    approveNext,
    isApproving,
    nextStep,
    steps,
    status: nextStep ? ("needs_approval" as const) : ("approvals_ready" as const),
    submittedHash: undefined as Hash | undefined,
  };
};
