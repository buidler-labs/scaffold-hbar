"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useAxelarBridgeStrategy, useCcipBridgeStrategy, useLayerZeroBridgeStrategy } from "./providers";
import { useBridgeReadiness } from "./useBridgeReadiness";
import { useDebouncedValue } from "./useDebouncedValue";
import { useQueryClient } from "@tanstack/react-query";
import { parseUnits } from "viem";
import type { Address } from "viem";
import { getBalanceQueryKey } from "wagmi/query";
import type {
  BridgeBalanceCheck,
  BridgeChainId,
  BridgeConfigIssue,
  BridgeDirection,
  BridgeFlow,
  BridgePrimaryAction,
  BridgeProvider,
  BridgeProviderId,
  BridgeProviderStrategy,
  BridgeReadiness,
  BridgeRoute,
} from "~~/services/bridge";
import { isQuotableDecimalAmount, normalizeBridgeAmount } from "~~/services/bridge/amount";
import { BRIDGE_NETWORKS } from "~~/services/bridge/constants";
import { getBridgeProvider, getRouteConfigIssues } from "~~/services/bridge/registry";

type SwitchBridgeChain = (variables: { chainId: BridgeChainId }) => void;

type UseBridgeFlowArgs = {
  address?: Address;
  amount: string;
  chainId?: number;
  direction: BridgeDirection;
  isConnected: boolean;
  isSwitchingChain: boolean;
  providerId: BridgeProviderId;
  switchChain: SwitchBridgeChain;
};

type GetBridgePrimaryActionArgs = {
  approvals: BridgeProviderStrategy["approvals"];
  balanceCheck: BridgeBalanceCheck;
  isConnected: boolean;
  isQuoteSettling: boolean;
  isSwitchingChain: boolean;
  provider: BridgeProvider;
  quote: BridgeProviderStrategy["quote"];
  readiness: BridgeReadiness;
  route: BridgeRoute;
  sourceNetworkLabel: string;
  submission: BridgeProviderStrategy["submission"];
  switchChain: SwitchBridgeChain;
};

const getBridgePrimaryAction = ({
  approvals,
  balanceCheck,
  isConnected,
  isQuoteSettling,
  isSwitchingChain,
  provider,
  quote,
  readiness,
  route,
  sourceNetworkLabel,
  submission,
  switchChain,
}: GetBridgePrimaryActionArgs): BridgePrimaryAction => {
  if (!isConnected) {
    return {
      kind: "connect_wallet",
      label: "Connect wallet from header",
      canExecute: false,
      isPending: false,
    };
  }

  if (readiness.status === "wrong_network") {
    return {
      kind: "switch_network",
      label: `Switch to ${sourceNetworkLabel}`,
      canExecute: true,
      isPending: isSwitchingChain,
      execute: () => switchChain({ chainId: route.sourceChainId }),
    };
  }

  if (readiness.status !== "ready") {
    return {
      kind: "blocked",
      label: "Bridge unavailable",
      canExecute: false,
      isPending: false,
      reason: readiness.reason,
    };
  }

  if (submission.status === "sending" || submission.status === "relaying") {
    return {
      kind: "send",
      label:
        submission.status === "relaying" ? `Relaying ${provider.label} transfer` : `Sending ${provider.label} transfer`,
      canExecute: true,
      isPending: true,
      execute: async () => {
        await submission.sendTransfer?.();
      },
    };
  }

  if (submission.status === "submitted") {
    return {
      kind: "blocked",
      label: `${provider.label} transfer submitted`,
      canExecute: false,
      isPending: false,
    };
  }

  if (submission.status === "delivered") {
    return {
      kind: "blocked",
      label: `${provider.label} transfer delivered`,
      canExecute: false,
      isPending: false,
    };
  }

  if (submission.status === "relay_failed") {
    return {
      kind: "blocked",
      label: `${provider.label} relay failed`,
      canExecute: false,
      isPending: false,
    };
  }

  if (!balanceCheck.hasEnoughSourceBalance) {
    return {
      kind: "blocked",
      label: balanceCheck.blockedLabel ?? "Insufficient source token balance",
      canExecute: false,
      isPending: false,
      reason: balanceCheck.reason,
    };
  }

  if (isQuoteSettling || quote.isUpdating) {
    return {
      kind: "blocked",
      label: `Updating ${provider.label} quote`,
      canExecute: false,
      isPending: false,
    };
  }

  switch (quote.status) {
    case "quoting":
      return {
        kind: "blocked",
        label: `Quoting ${provider.label} fee`,
        canExecute: false,
        isPending: false,
      };
    case "quoted":
      break;
    case "failed":
      return {
        kind: "blocked",
        label: "Unable to quote fee",
        canExecute: false,
        isPending: false,
        reason: quote.reason,
      };
    case "invalid_amount":
      return {
        kind: "blocked",
        label: "Enter a valid amount",
        canExecute: false,
        isPending: false,
        reason: quote.reason,
      };
    default:
      return {
        kind: "blocked",
        label: "Enter amount to quote",
        canExecute: false,
        isPending: false,
        reason: quote.reason,
      };
  }

  switch (approvals.status) {
    case "checking":
      return {
        kind: "blocked",
        label: "Checking approvals",
        canExecute: false,
        isPending: false,
      };
    case "needs_approval":
      return {
        kind: "approve",
        label: approvals.nextStep?.label ?? "Approve token",
        canExecute: true,
        isPending: false,
        execute: async () => {
          await approvals.approveNext();
        },
      };
    case "approving":
      return {
        kind: "approve",
        label: `${approvals.nextStep?.label ?? "Approval"} pending`,
        canExecute: true,
        isPending: true,
        execute: async () => {
          await approvals.approveNext();
        },
      };
    case "approvals_ready":
      if (submission.canSend && submission.sendTransfer) {
        return {
          kind: "send",
          label: `Send ${provider.label} transfer`,
          canExecute: true,
          isPending: false,
          execute: async () => {
            await submission.sendTransfer?.();
          },
        };
      }

      return {
        kind: "blocked",
        label: "Send unavailable",
        canExecute: false,
        isPending: false,
      };
    case "failed":
      return {
        kind: "blocked",
        label: "Unable to check approvals",
        canExecute: false,
        isPending: false,
      };
    default:
      return {
        kind: "blocked",
        label: "Quote ready - approvals next",
        canExecute: false,
        isPending: false,
      };
  }
};

const getSourceBalanceCheck = ({
  amount,
  tokenAccount,
}: {
  amount: string;
  tokenAccount: BridgeProviderStrategy["tokenAccount"];
}): BridgeBalanceCheck => {
  const normalizedAmount = amount.trim();
  if (!normalizedAmount || !isQuotableDecimalAmount(normalizedAmount)) {
    return { hasEnoughSourceBalance: true };
  }

  if (tokenAccount.status === "checking") {
    return {
      blockedLabel: "Checking source token balance",
      hasEnoughSourceBalance: false,
    };
  }

  if (tokenAccount.status === "failed") {
    return {
      blockedLabel: "Unable to read source token balance",
      hasEnoughSourceBalance: false,
      reason: "Unable to read your source token balance. Refresh balances and try again.",
    };
  }

  const sourceToken = tokenAccount.sourceToken;
  if (sourceToken?.balance === undefined || sourceToken.decimals === undefined) {
    return {
      blockedLabel: "Unable to read source token balance",
      hasEnoughSourceBalance: false,
      reason: "Unable to read your source token balance for this route.",
    };
  }

  let amountInBaseUnits: bigint;
  try {
    amountInBaseUnits = parseUnits(normalizeBridgeAmount(normalizedAmount), sourceToken.decimals);
  } catch {
    return { hasEnoughSourceBalance: true };
  }

  if (amountInBaseUnits <= 0n || amountInBaseUnits <= sourceToken.balance) {
    return { hasEnoughSourceBalance: true };
  }

  const balanceLabel = sourceToken.balanceLabel ? ` (${sourceToken.balanceLabel} available)` : "";

  return {
    blockedLabel: "Insufficient source token balance",
    hasEnoughSourceBalance: false,
    reason: `Amount exceeds your source token balance${balanceLabel}.`,
  };
};

export const useBridgeFlow = ({
  address,
  amount,
  chainId,
  direction,
  isConnected,
  isSwitchingChain,
  providerId,
  switchChain,
}: UseBridgeFlowArgs): BridgeFlow => {
  const queryClient = useQueryClient();
  const { route, readiness, isChecking } = useBridgeReadiness(providerId, direction, chainId);
  const provider = getBridgeProvider(providerId);
  const sourceNetwork = BRIDGE_NETWORKS[route.sourceChainId];
  const destinationNetwork = BRIDGE_NETWORKS[route.destinationChainId];
  const debouncedAmount = useDebouncedValue(amount, 350);
  const isQuoteSettling = amount.trim() !== debouncedAmount.trim();
  const configIssues = useMemo<BridgeConfigIssue[]>(() => getRouteConfigIssues(route), [route]);
  const showConfigWarning = configIssues.length > 0 && readiness.status === "misconfigured";

  const axelarStrategy = useAxelarBridgeStrategy({
    address,
    amount: debouncedAmount,
    enabled: providerId === "axelar",
    isConnected,
    readinessStatus: readiness.status,
    route,
  });
  const ccipStrategy = useCcipBridgeStrategy({
    address,
    amount: debouncedAmount,
    enabled: providerId === "ccip",
    isConnected,
    readinessStatus: readiness.status,
    route,
  });
  const layerZeroStrategy = useLayerZeroBridgeStrategy({
    address,
    amount: debouncedAmount,
    enabled: providerId === "layerzero",
    isConnected,
    readinessStatus: readiness.status,
    route,
  });

  const activeStrategy =
    providerId === "axelar" ? axelarStrategy : providerId === "ccip" ? ccipStrategy : layerZeroStrategy;
  const { resetSubmission: resetAxelarSubmission } = axelarStrategy;
  const { resetSubmission: resetCcipSubmission } = ccipStrategy;
  const { resetSubmission: resetLayerZeroSubmission } = layerZeroStrategy;

  const balanceCheck = useMemo(
    () =>
      getSourceBalanceCheck({
        amount,
        tokenAccount: activeStrategy.tokenAccount,
      }),
    [activeStrategy.tokenAccount, amount],
  );

  useEffect(() => {
    resetAxelarSubmission();
    resetCcipSubmission();
    resetLayerZeroSubmission();
  }, [address, amount, direction, providerId, resetAxelarSubmission, resetCcipSubmission, resetLayerZeroSubmission]);

  const sendTransferWithBalanceInvalidation = useCallback(async () => {
    const hash = await activeStrategy.submission.sendTransfer?.();
    if (!hash) return hash;

    await Promise.all([
      activeStrategy.tokenAccount.invalidate(),
      address
        ? queryClient.invalidateQueries({
            queryKey: getBalanceQueryKey({ address, chainId: route.sourceChainId }),
          })
        : undefined,
    ]);

    return hash;
  }, [activeStrategy.submission, activeStrategy.tokenAccount, address, queryClient, route.sourceChainId]);

  const submission = useMemo<BridgeProviderStrategy["submission"]>(
    () => ({
      ...activeStrategy.submission,
      canSend: activeStrategy.submission.canSend && balanceCheck.hasEnoughSourceBalance,
      sendTransfer:
        activeStrategy.submission.sendTransfer && balanceCheck.hasEnoughSourceBalance
          ? sendTransferWithBalanceInvalidation
          : undefined,
    }),
    [activeStrategy.submission, balanceCheck.hasEnoughSourceBalance, sendTransferWithBalanceInvalidation],
  );

  const primaryAction = useMemo(
    () =>
      getBridgePrimaryAction({
        approvals: activeStrategy.approvals,
        balanceCheck,
        isConnected,
        isQuoteSettling,
        isSwitchingChain,
        provider,
        quote: activeStrategy.quote,
        readiness,
        route,
        sourceNetworkLabel: sourceNetwork.shortLabel,
        submission,
        switchChain,
      }),
    [
      activeStrategy.approvals,
      activeStrategy.quote,
      balanceCheck,
      isConnected,
      isQuoteSettling,
      isSwitchingChain,
      provider,
      readiness,
      route,
      submission,
      sourceNetwork.shortLabel,
      switchChain,
    ],
  );

  return {
    route,
    provider,
    sourceNetwork,
    destinationNetwork,
    readiness,
    isChecking,
    isQuoteSettling,
    configIssues,
    showConfigWarning,
    balanceCheck,
    quote: activeStrategy.quote,
    approvals: activeStrategy.approvals,
    tokenAccount: activeStrategy.tokenAccount,
    submission,
    primaryAction,
    resetSubmission: activeStrategy.resetSubmission,
  };
};
