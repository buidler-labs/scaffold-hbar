"use client";

import React from "react";
import { ProofCard } from "~~/components/ProofCard";
import type { TopicMessage } from "~~/hooks/useTopicMessages";

type ProofWallProps = {
  messages: TopicMessage[];
  isLoading?: boolean;
  error?: Error | null;
};

export function ProofWall({ messages, isLoading, error }: ProofWallProps) {
  if (error) {
    return (
      <div className="rounded-xl border border-error/30 bg-base-100 p-6 text-center text-error">
        Failed to load messages: {error.message}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 rounded-xl bg-base-200 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!messages.length) {
    return (
      <div className="rounded-xl border border-base-300 bg-base-100 p-8 text-center text-base-content/70">
        No proofs yet. Be the first to post!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((msg, idx) => (
        <ProofCard key={msg.consensus_timestamp ?? idx} message={msg} />
      ))}
    </div>
  );
}
