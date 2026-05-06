"use client";

import type { Hash } from "viem";
import type { BridgeSendStatus } from "~~/services/bridge";
import { getBlockExplorerTxLink } from "~~/utils/scaffold-hbar";

type BridgeSubmissionProps = {
  accountAddress?: string;
  providerExplorerUrl: string;
  providerLabel: string;
  sourceChainId: number;
  status: BridgeSendStatus;
  txHash?: Hash;
};

export const BridgeSubmission = ({
  accountAddress,
  providerExplorerUrl,
  providerLabel,
  sourceChainId,
  status,
  txHash,
}: BridgeSubmissionProps) => {
  if (status === "idle" || status === "sending") return null;

  if (status === "failed") {
    return (
      <div className="alert border-error/20 bg-error/10 text-error">
        <span>Unable to submit {providerLabel} transfer.</span>
      </div>
    );
  }

  const explorerLink = txHash ? getBlockExplorerTxLink(sourceChainId, txHash) : "";
  const providerAccountLink = accountAddress
    ? `${providerExplorerUrl.replace(/\/$/, "")}/address/${accountAddress.toLowerCase()}`
    : providerExplorerUrl;

  return (
    <div className="rounded-2xl border border-success/20 bg-success/10 p-4 text-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="m-0 font-semibold text-success">{providerLabel} transfer submitted</p>
        <a className="link text-xs font-semibold" href={providerAccountLink} rel="noreferrer" target="_blank">
          {providerLabel} Explorer
        </a>
      </div>
      {txHash ? (
        <div className="mt-3 flex items-center justify-between gap-3 text-base-content/75">
          <span>Source tx</span>
          {explorerLink ? (
            <a className="link break-all font-mono text-xs" href={explorerLink} rel="noreferrer" target="_blank">
              {txHash}
            </a>
          ) : (
            <span className="break-all font-mono text-xs">{txHash}</span>
          )}
        </div>
      ) : null}
    </div>
  );
};
