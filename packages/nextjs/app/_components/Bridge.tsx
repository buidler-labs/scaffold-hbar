"use client";

import { useState } from "react";
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
  type BridgeDirection,
  type BridgeProviderId,
  getDefaultBridgeDirection,
  useBridgeFlow,
} from "~~/services/bridge";

export const Bridge = () => {
  const { address, chain, isConnected } = useAccount();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();
  const [providerId, setProviderId] = useState<BridgeProviderId>("axelar");
  const [direction, setDirection] = useState<BridgeDirection>(getDefaultBridgeDirection());
  const [amount, setAmount] = useState("");
  const {
    approvals,
    balanceCheck,
    configIssues,
    destinationNetwork,
    isChecking,
    isQuoteSettling,
    primaryAction,
    provider,
    quote,
    readiness,
    route,
    showConfigWarning,
    sourceNetwork,
    submission,
    tokenAccount,
  } = useBridgeFlow({
    providerId,
    direction,
    amount,
    address,
    chainId: chain?.id,
    isConnected,
    switchChain,
    isSwitchingChain,
  });

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

            {!balanceCheck.hasEnoughSourceBalance && balanceCheck.reason ? (
              <div className="rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-warning">
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
                  <span className="text-sm font-semibold">{balanceCheck.reason}</span>
                </div>
              </div>
            ) : null}

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

            <BridgeQuote
              isUpdating={isQuoteSettling || Boolean(quote.isUpdating)}
              providerLabel={provider.label}
              quote={quote}
            />
            <BridgeApprovals providerLabel={provider.label} status={approvals.status} steps={approvals.steps} />
            <BridgeSubmission
              accountAddress={address}
              followUpCommand={submission.followUpCommand}
              providerExplorerUrl={provider.trackerUrl}
              providerLabel={provider.label}
              relayError={submission.relayError}
              sourceChainId={route.sourceChainId}
              status={submission.status}
              txHash={submission.submittedHash}
            />

            <button
              type="button"
              className="btn btn-primary w-full"
              disabled={!primaryAction.canExecute || primaryAction.isPending}
              onClick={() => {
                if (!primaryAction.canExecute) return;
                void Promise.resolve(primaryAction.execute()).catch(() => undefined);
              }}
            >
              {primaryAction.isPending ? <span className="loading loading-spinner loading-sm" /> : null}
              {primaryAction.label}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
