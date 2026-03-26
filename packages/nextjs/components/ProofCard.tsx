"use client";

import React from "react";
import { BlockieAvatar } from "~~/components/scaffold-eth";
import { proofWallConfig } from "~~/config/proofWallConfig";
import type { TopicMessage } from "~~/hooks/useTopicMessages";
import { isEvmAddress, truncateIdentity } from "~~/utils/scaffold-eth/identity";

type ProofCardProps = {
  message: TopicMessage;
};

function formatConsensusTimestamp(ts: string): string {
  if (!ts) return "";
  const [seconds] = ts.split(".");
  const ms = Number(seconds) * 1000;
  if (Number.isNaN(ms)) return ts;
  return new Date(ms).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function ProofCard({ message }: ProofCardProps) {
  const timestamp = message.consensus_timestamp ?? "";
  const sequenceNumber = message.sequence_number;
  let payload: { text?: string; author?: string; timestamp?: number } = {};
  try {
    if (typeof message.message === "string") {
      const raw = atob(message.message);
      payload = JSON.parse(raw) as typeof payload;
    }
  } catch {
    payload = { text: String(message.message) };
  }

  const hashScanUrl = proofWallConfig.hashScanBaseUrl;
  const txLink = timestamp ? `${hashScanUrl}/transaction/${timestamp}` : null;
  const author = payload.author ?? null;
  const hasAuthor = Boolean(author);
  const evmAuthor = isEvmAddress(author);

  return (
    <article className="bg-base-100 rounded-xl border border-base-300 p-5 shadow-sm hover:shadow-md transition-shadow">
      <p className="text-base-content whitespace-pre-wrap break-words leading-relaxed">{payload.text ?? "—"}</p>
      <footer className="mt-4 flex flex-wrap items-center gap-3 text-sm text-base-content/70">
        {hasAuthor && author && (
          <span className="flex items-center gap-2 min-w-0">
            <BlockieAvatar address={author} size={24} />
            <span className="font-mono truncate max-w-[220px]" title={author}>
              {truncateIdentity(author, evmAuthor ? 6 : 8, evmAuthor ? 4 : 6)}
            </span>
          </span>
        )}
        {sequenceNumber != null && <span className="text-base-content/50">#{sequenceNumber}</span>}
        {timestamp && (
          <time dateTime={timestamp} className="text-base-content/60">
            {formatConsensusTimestamp(timestamp)}
          </time>
        )}
        {txLink && (
          <a href={txLink} target="_blank" rel="noreferrer" className="link link-primary text-xs ml-auto">
            View on HashScan →
          </a>
        )}
      </footer>
    </article>
  );
}
