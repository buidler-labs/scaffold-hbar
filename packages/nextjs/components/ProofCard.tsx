"use client";

import React from "react";
import { proofWallConfig } from "~~/config/proofWallConfig";
import type { TopicMessage } from "~~/hooks/useTopicMessages";

type ProofCardProps = {
  message: TopicMessage;
};

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

  return (
    <div className="bg-base-100 rounded-xl border border-base-300 p-4 shadow-sm">
      <p className="text-base-content whitespace-pre-wrap break-words">{payload.text ?? "—"}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-base-content/70">
        {payload.author && (
          <span className="font-mono truncate max-w-[200px]" title={payload.author}>
            {payload.author}
          </span>
        )}
        {sequenceNumber != null && <span>#{sequenceNumber}</span>}
        {timestamp && <span>{new Date(timestamp.split(".")[0]).toLocaleString()}</span>}
        {txLink && (
          <a href={txLink} target="_blank" rel="noreferrer" className="link link-primary text-xs">
            View on HashScan
          </a>
        )}
      </div>
    </div>
  );
}
