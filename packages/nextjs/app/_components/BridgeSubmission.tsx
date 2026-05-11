"use client";

import type { Hash } from "viem";
import type { BridgeSendStatus } from "~~/services/bridge";
import { getBlockExplorerTxLink } from "~~/utils/scaffold-hbar";

type BridgeSubmissionProps = {
  accountAddress?: string;
  followUpCommand?: string;
  providerExplorerUrl: string;
  providerLabel: string;
  relayError?: string;
  sourceChainId: number;
  status: BridgeSendStatus;
  txHash?: Hash;
};

export const BridgeSubmission = ({
  accountAddress,
  followUpCommand,
  providerExplorerUrl,
  providerLabel,
  relayError,
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

  const isRelayFailed = status === "relay_failed";
  const isRelaying = status === "relaying";
  const isDelivered = status === "delivered";
  const explorerLink = txHash ? getBlockExplorerTxLink(sourceChainId, txHash) : "";
  const providerAccountLink = accountAddress
    ? `${providerExplorerUrl.replace(/\/$/, "")}/address/${accountAddress.toLowerCase()}`
    : providerExplorerUrl;
  const containerClassName = isRelayFailed
    ? "rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm"
    : "rounded-2xl border border-success/20 bg-success/10 p-4 text-sm";
  const titleClassName = isRelayFailed ? "m-0 font-semibold text-warning" : "m-0 font-semibold text-success";
  const isNonceGap = Boolean(relayError?.includes("missing earlier message nonce"));
  const title = isDelivered
    ? `${providerLabel} transfer delivered`
    : isRelaying
      ? `${providerLabel} relay in progress`
      : isRelayFailed
        ? `${providerLabel} automatic relay failed`
        : `${providerLabel} transfer submitted`;

  return (
    <div className={containerClassName}>
      <div className="flex items-center justify-between gap-3">
        <p className={titleClassName}>{title}</p>
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

      {isRelaying ? (
        <div className="mt-3 flex items-center gap-2 text-base-content/75">
          <span className="loading loading-spinner loading-xs" />
          <span>Delivering through the mock LayerZero relay.</span>
        </div>
      ) : null}

      {isRelayFailed && followUpCommand ? (
        <div className="mt-3 rounded-lg border border-warning/20 bg-base-100/60 p-3 text-base-content/75">
          {relayError ? (
            <div className="mb-3 rounded bg-warning/10 px-3 py-2 text-xs text-warning">
              <p className="m-0 font-semibold">
                {isNonceGap ? "Previous LayerZero messages must be relayed first." : "Automatic relay error"}
              </p>
              <p className="m-0 mt-1 text-base-content/75">{relayError}</p>
            </div>
          ) : null}
          <p className="m-0 text-xs font-semibold uppercase tracking-wide text-base-content/50">Fallback command</p>
          <code className="mt-2 block break-all rounded bg-base-300/70 px-3 py-2 text-xs">{followUpCommand}</code>
        </div>
      ) : null}
    </div>
  );
};
