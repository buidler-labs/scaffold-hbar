"use client";

import React from "react";
import { BlockieAvatar } from "~~/components/scaffold-eth";
import { proofWallConfig } from "~~/config/proofWallConfig";
import type { TopicMessage } from "~~/hooks/useTopicMessages";

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

function truncateAddress(addr: string, start = 6, end = 4): string {
  if (!addr || addr.length <= start + end) return addr;
  if (addr.startsWith("0x")) return `${addr.slice(0, start + 2)}…${addr.slice(-end)}`;
  return `${addr.slice(0, start)}…${addr.slice(-end)}`;
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
  const isEvmAddress = payload.author?.startsWith("0x") && payload.author.length === 42;

  return (
    <article className="bg-base-100 rounded-xl border border-base-300 p-5 shadow-sm hover:shadow-md transition-shadow">
      <p className="text-base-content whitespace-pre-wrap break-words leading-relaxed">{payload.text ?? "—"}</p>
      <footer className="mt-4 flex flex-wrap items-center gap-3 text-sm text-base-content/70">
        {payload.author && (
          <span className="flex items-center gap-2 min-w-0">
            {isEvmAddress && <BlockieAvatar address={payload.author} size={24} />}
            <span className="font-mono truncate max-w-[220px]" title={payload.author}>
              {isEvmAddress ? truncateAddress(payload.author) : truncateAddress(payload.author, 8, 6)}
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
