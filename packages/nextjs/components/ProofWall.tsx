"use client";

import React from "react";
import { ProofCard } from "~~/components/ProofCard";
import type { TopicMessage } from "~~/hooks/useTopicMessages";

type ProofWallProps = {
  messages: TopicMessage[];
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  /** Custom empty state (e.g. for "My Proofs" page) */
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
};

export function ProofWall({
  messages,
  isLoading,
  error,
  onRetry,
  emptyTitle = "No proofs yet.",
  emptyDescription = "Be the first to post a timestamped proof.",
  emptyAction,
}: ProofWallProps) {
  if (error) {
    return (
      <div className="rounded-xl border border-error/30 bg-base-100 p-8 text-center">
        <p className="text-error font-medium">Failed to load messages</p>
        <p className="text-base-content/70 text-sm mt-1">{error.message}</p>
        {onRetry && (
          <button type="button" className="btn btn-sm btn-outline btn-error mt-4" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading proofs">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-28 rounded-xl bg-base-200 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!messages.length) {
    return (
      <div className="rounded-xl border border-base-300 bg-base-100 p-10 text-center">
        <p className="text-base-content/70 text-lg">{emptyTitle}</p>
        <p className="text-base-content/50 text-sm mt-1">{emptyDescription}</p>
        {emptyAction && <div className="mt-4">{emptyAction}</div>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs uppercase tracking-wider text-base-content/50">Newest first</p>
      {messages.map((msg, idx) => (
        <ProofCard
          key={msg.consensus_timestamp ? `${msg.consensus_timestamp}-${msg.sequence_number ?? idx}` : idx}
          message={msg}
        />
      ))}
    </div>
  );
}
