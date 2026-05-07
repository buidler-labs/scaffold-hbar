"use client";

import { useEffect, useMemo } from "react";
import { BRIDGE_NETWORKS } from "./constants";
import { useAxelarBridgeStrategy, useCcipBridgeStrategy, useLayerZeroBridgeStrategy } from "./providers";
import { getBridgeProvider, getRouteConfigIssues } from "./registry";
import type {
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
} from "./types";
import { useBridgeReadiness } from "./useBridgeReadiness";
import type { Address } from "viem";

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
  isConnected: boolean;
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
  isConnected,
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

  if (submission.status === "sending") {
    return {
      kind: "send",
      label: `Sending ${provider.label} transfer`,
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
  const { route, readiness, isChecking } = useBridgeReadiness(providerId, direction, chainId);
  const provider = getBridgeProvider(providerId);
  const sourceNetwork = BRIDGE_NETWORKS[route.sourceChainId];
  const destinationNetwork = BRIDGE_NETWORKS[route.destinationChainId];
  const configIssues = useMemo<BridgeConfigIssue[]>(() => getRouteConfigIssues(route), [route]);
  const showConfigWarning = configIssues.length > 0 && readiness.status === "misconfigured";

  const axelarStrategy = useAxelarBridgeStrategy({
    address,
    amount,
    enabled: providerId === "axelar",
    isConnected,
    readinessStatus: readiness.status,
    route,
  });
  const ccipStrategy = useCcipBridgeStrategy({
    address,
    amount,
    enabled: providerId === "ccip",
    isConnected,
    readinessStatus: readiness.status,
    route,
  });
  const layerZeroStrategy = useLayerZeroBridgeStrategy({
    address,
    amount,
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

  useEffect(() => {
    resetAxelarSubmission();
    resetCcipSubmission();
    resetLayerZeroSubmission();
  }, [address, amount, direction, providerId, resetAxelarSubmission, resetCcipSubmission, resetLayerZeroSubmission]);

  const primaryAction = useMemo(
    () =>
      getBridgePrimaryAction({
        approvals: activeStrategy.approvals,
        isConnected,
        isSwitchingChain,
        provider,
        quote: activeStrategy.quote,
        readiness,
        route,
        sourceNetworkLabel: sourceNetwork.shortLabel,
        submission: activeStrategy.submission,
        switchChain,
      }),
    [
      activeStrategy.approvals,
      activeStrategy.quote,
      activeStrategy.submission,
      isConnected,
      isSwitchingChain,
      provider,
      readiness,
      route,
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
    configIssues,
    showConfigWarning,
    quote: activeStrategy.quote,
    approvals: activeStrategy.approvals,
    tokenAccount: activeStrategy.tokenAccount,
    submission: activeStrategy.submission,
    primaryAction,
    resetSubmission: activeStrategy.resetSubmission,
  };
};
