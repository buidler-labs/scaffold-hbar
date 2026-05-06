"use client";

import { useEffect, useMemo, useState } from "react";
import { BridgeAmountInput } from "./BridgeAmountInput";
import { BridgeApprovals } from "./BridgeApprovals";
import { BridgeDirectionSelector } from "./BridgeDirectionSelector";
import { BridgeProviderSelector } from "./BridgeProviderSelector";
import { BridgeQuote } from "./BridgeQuote";
import { BridgeStatus } from "./BridgeStatus";
import { BridgeSubmission } from "./BridgeSubmission";
import { BridgeTokenBalances } from "./BridgeTokenBalances";
import { Address, Balance } from "@scaffold-hbar-ui/components";
import { useAccount, useSwitchChain } from "wagmi";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import {
  type AxelarQuoteStatus,
  BRIDGE_NETWORKS,
  type BridgeDirection,
  type BridgeProviderId,
  type BridgeReadinessStatus,
  type CcipApprovalStatus,
  type CcipQuoteStatus,
  type CcipSendStatus,
  getBridgeProvider,
  getDefaultBridgeDirection,
  getRouteConfigIssues,
  useAxelarQuote,
  useAxelarTokenAccount,
  useBridgeReadiness,
  useCcipApprovals,
  useCcipQuote,
  useCcipSend,
  useCcipTokenAccount,
} from "~~/services/bridge";

const getBridgeActionLabel = ({
  quoteStatus,
  ccipApprovalStatus,
  ccipSendStatus,
  isConnected,
  nextApprovalLabel,
  providerId,
  providerLabel,
  readinessStatus,
  sourceNetworkLabel,
}: {
  ccipApprovalStatus: CcipApprovalStatus;
  quoteStatus: AxelarQuoteStatus | CcipQuoteStatus;
  ccipSendStatus: CcipSendStatus;
  isConnected: boolean;
  nextApprovalLabel?: string;
  providerId: BridgeProviderId;
  providerLabel: string;
  readinessStatus: BridgeReadinessStatus;
  sourceNetworkLabel: string;
}) => {
  if (!isConnected) return "Connect wallet from header";
  if (readinessStatus === "wrong_network") return `Switch to ${sourceNetworkLabel}`;
  if (readinessStatus !== "ready") return "Bridge unavailable";

  if (providerId === "ccip" && ccipSendStatus === "sending") return "Sending CCIP transfer";
  if (providerId === "ccip" && ccipSendStatus === "submitted") return "CCIP transfer submitted";

  switch (quoteStatus) {
    case "quoting":
      return `Quoting ${providerLabel} fee`;
    case "quoted":
      break;
    case "failed":
      return "Unable to quote fee";
    case "invalid_amount":
      return "Enter a valid amount";
    default:
      return "Enter amount to quote";
  }

  if (providerId !== "ccip") return `${providerLabel} send adapter not available yet`;

  switch (ccipApprovalStatus) {
    case "checking":
      return "Checking approvals";
    case "needs_approval":
      return nextApprovalLabel ?? "Approve token";
    case "approving":
      return `${nextApprovalLabel ?? "Approval"} pending`;
    case "approvals_ready":
      return "Send CCIP transfer";
    case "failed":
      return "Unable to check approvals";
    default:
      return "Quote ready - approvals next";
  }
};

export const Bridge = () => {
  const { address, chain, isConnected } = useAccount();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();
  const [providerId, setProviderId] = useState<BridgeProviderId>("axelar");
  const [direction, setDirection] = useState<BridgeDirection>(getDefaultBridgeDirection());
  const [amount, setAmount] = useState("");

  const { route, readiness, isChecking } = useBridgeReadiness(providerId, direction, chain?.id);
  const sourceNetwork = BRIDGE_NETWORKS[route.sourceChainId];
  const destinationNetwork = BRIDGE_NETWORKS[route.destinationChainId];
  const selectedProvider = getBridgeProvider(providerId);
  const configIssues = useMemo(() => getRouteConfigIssues(route), [route]);
  const axelarQuote = useAxelarQuote({
    amount,
    enabled: isConnected && readiness.status === "ready",
    route,
  });
  const ccipQuote = useCcipQuote({
    amount,
    enabled: isConnected && readiness.status === "ready",
    recipient: address,
    route,
  });
  const axelarTokenAccount = useAxelarTokenAccount({
    account: address,
    enabled: isConnected && providerId === "axelar",
    route,
  });
  const ccipTokenAccount = useCcipTokenAccount({
    account: address,
    enabled: isConnected && providerId === "ccip",
    route,
  });
  const ccipApprovals = useCcipApprovals({
    amountInBaseUnits: ccipQuote.status === "quoted" ? ccipQuote.amountInBaseUnits : undefined,
    enabled: isConnected && readiness.status === "ready",
    owner: address,
    route,
  });
  const ccipSend = useCcipSend({
    enabled: isConnected && readiness.status === "ready" && ccipApprovals.status === "approvals_ready",
    quote: ccipQuote,
    recipient: address,
    route,
    sender: address,
  });
  const { reset: resetCcipSend } = ccipSend;
  const quote = providerId === "axelar" ? axelarQuote : ccipQuote;
  const tokenAccount = providerId === "axelar" ? axelarTokenAccount : ccipTokenAccount;

  useEffect(() => {
    resetCcipSend();
  }, [address, amount, direction, providerId, resetCcipSend]);

  const actionLabel = useMemo(() => {
    return getBridgeActionLabel({
      ccipApprovalStatus: ccipApprovals.status,
      quoteStatus: quote.status,
      ccipSendStatus: ccipSend.status,
      isConnected,
      nextApprovalLabel: ccipApprovals.nextStep?.label,
      providerId,
      providerLabel: selectedProvider.label,
      readinessStatus: readiness.status,
      sourceNetworkLabel: sourceNetwork.shortLabel,
    });
  }, [
    ccipApprovals.nextStep?.label,
    ccipApprovals.status,
    ccipSend.status,
    isConnected,
    providerId,
    quote.status,
    readiness.status,
    selectedProvider.label,
    sourceNetwork.shortLabel,
  ]);

  const canSwitchNetwork = isConnected && readiness.status === "wrong_network";
  const canApproveCcip = ccipApprovals.status === "needs_approval";
  const canSendCcip = ccipApprovals.status === "approvals_ready" && ccipSend.status !== "submitted";
  const isActionPending = isSwitchingChain || ccipApprovals.status === "approving" || ccipSend.status === "sending";
  const showConfigWarning = configIssues.length > 0 && readiness.status === "misconfigured";

  return (
    <div className="flex grow flex-col bg-base-200 px-4 py-8 md:py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <h1 className="m-0 text-3xl font-bold md:text-4xl">Bridge</h1>

        <div className="rounded-3xl border border-base-300 bg-base-100 shadow-xl">
          <div className="flex flex-col gap-6 p-5 md:p-6">
            <BridgeProviderSelector
              direction={direction}
              selectedProviderId={providerId}
              onSelectProvider={setProviderId}
            />

            <BridgeDirectionSelector direction={direction} onChangeDirection={setDirection} />

            <BridgeAmountInput amount={amount} onChangeAmount={setAmount} />
            <BridgeTokenBalances
              destinationToken={tokenAccount.destinationToken}
              showHtsAssociationNotice={tokenAccount.showHtsAssociationNotice}
              sourceToken={tokenAccount.sourceToken}
              status={tokenAccount.status}
            />

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-base-300 bg-base-200 px-4 py-3">
                <p className="m-0 text-xs font-semibold uppercase tracking-wide text-base-content/50">Receiver</p>
                <div className="mt-2 min-h-6">
                  {address ? (
                    <Address address={address} chain={destinationNetwork.chain} size="sm" />
                  ) : (
                    <span className="text-sm text-base-content/60">Connect wallet</span>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-base-300 bg-base-200 px-4 py-3">
                <p className="m-0 text-xs font-semibold uppercase tracking-wide text-base-content/50">
                  Source gas balance
                </p>
                <div className="min-h-6">
                  {address ? (
                    <Balance address={address} chain={sourceNetwork.chain} />
                  ) : (
                    <span className="text-sm text-base-content/60">Connect wallet</span>
                  )}
                </div>
              </div>
            </div>

            {showConfigWarning ? (
              <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4 text-warning">
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="m-0 text-sm font-semibold">Missing configuration</p>
                      <span className="badge badge-warning badge-sm">{configIssues.length}</span>
                    </div>
                    <ul className="m-0 mt-3 grid gap-2 p-0 text-sm text-base-content/80">
                      {configIssues.slice(0, 4).map(({ issue }) => (
                        <li key={issue} className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <BridgeStatus isChecking={isChecking} isConnected={isConnected} readiness={readiness} />
            )}

            <BridgeQuote providerLabel={selectedProvider.label} quote={quote} />
            <BridgeApprovals
              providerLabel={selectedProvider.label}
              status={ccipApprovals.status}
              steps={ccipApprovals.steps}
            />
            <BridgeSubmission
              accountAddress={address}
              providerExplorerUrl={selectedProvider.trackerUrl}
              providerLabel={selectedProvider.label}
              sourceChainId={route.sourceChainId}
              status={ccipSend.status}
              txHash={ccipSend.submittedHash}
            />

            <button
              type="button"
              className="btn btn-primary w-full"
              disabled={(!canSwitchNetwork && !canApproveCcip && !canSendCcip) || isActionPending}
              onClick={() => {
                if (canSwitchNetwork) {
                  switchChain({ chainId: sourceNetwork.id });
                  return;
                }

                if (canApproveCcip) void ccipApprovals.approveNext().catch(() => undefined);
                if (canSendCcip) void ccipSend.sendCcip().catch(() => undefined);
              }}
            >
              {isActionPending ? <span className="loading loading-spinner loading-sm" /> : null}
              {actionLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
