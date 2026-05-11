"use client";

import { useCallback, useMemo, useState } from "react";
import type { Address, Hash, PublicClient } from "viem";
import { useReadContracts, useWriteContract } from "wagmi";
import type { BridgeApprovalStep, BridgeChainId } from "~~/services/bridge";
import { erc20BridgeAbi } from "~~/services/bridge/erc20Abi";
import { notification } from "~~/utils/scaffold-hbar";

type UseTokenApprovalsArgs<TStep extends BridgeApprovalStep> = {
  amountInBaseUnits?: bigint;
  enabled: boolean;
  missingConfig: boolean;
  owner?: Address;
  sourceChainId: BridgeChainId;
  sourceClient?: PublicClient;
  steps: TStep[];
  unsupported: boolean;
};

const getApprovalErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.includes("TOKEN_NOT_ASSOCIATED_TO_ACCOUNT")) {
    return "Associate this Hedera account with the HTS token before approving it.";
  }

  return error instanceof Error ? error.message : fallback;
};

export const useTokenApprovals = <TStep extends BridgeApprovalStep>({
  amountInBaseUnits,
  enabled,
  missingConfig,
  owner,
  sourceChainId,
  sourceClient,
  steps: approvalSteps,
  unsupported,
}: UseTokenApprovalsArgs<TStep>) => {
  const { writeContractAsync } = useWriteContract();
  const [approvingStepId, setApprovingStepId] = useState<TStep["id"] | undefined>();
  const shouldCheckAllowances = Boolean(
    enabled && !unsupported && !missingConfig && sourceClient && owner && amountInBaseUnits,
  );

  const allowanceQuery = useReadContracts({
    contracts: approvalSteps.map(step => ({
      address: step.tokenAddress,
      abi: erc20BridgeAbi,
      functionName: "allowance",
      args: [owner as Address, step.spenderAddress],
      chainId: sourceChainId,
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
        chainId: sourceChainId,
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
  }, [allowanceQuery, amountInBaseUnits, nextStep, sourceChainId, sourceClient, writeContractAsync]);

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

  if (unsupported) {
    return {
      approveNext,
      isApproving,
      nextStep,
      steps,
      status: "unsupported" as const,
      submittedHash: undefined as Hash | undefined,
    };
  }

  if (missingConfig) {
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
