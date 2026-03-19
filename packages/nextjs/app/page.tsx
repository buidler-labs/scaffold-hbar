"use client";

import { useState } from "react";
import { ProofWall } from "~~/components/ProofWall";
import { SubmitProofForm } from "~~/components/SubmitProofForm";
import { TopicSelector } from "~~/components/TopicSelector";
import { proofWallConfig } from "~~/config/proofWallConfig";
import { useTopicMessages } from "~~/hooks/useTopicMessages";

export default function ProofWallPage() {
  const [topicId, setTopicId] = useState(proofWallConfig.topicId);
  const effectiveTopicId = topicId || proofWallConfig.topicId;
  const { data, isLoading, error, refetch } = useTopicMessages(effectiveTopicId, {
    refetchInterval: 15_000,
  });

  return (
    <div className="flex flex-col grow">
      <div className="w-full max-w-3xl mx-auto px-4 py-8">
        {/* Hero */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Proof Wall</h1>
          <p className="text-base-content/70 mt-2">
            Post a timestamped proof on Hedera. Every message is an HCS consensus message — permanent and verifiable on
            HashScan.
          </p>
        </header>

        <TopicSelector topicId={effectiveTopicId} onTopicIdChange={setTopicId} />

        {effectiveTopicId ? (
          <>
            <section className="mt-8" aria-label="Submit a proof">
              <SubmitProofForm topicId={effectiveTopicId} />
            </section>
            <div className="divider my-8">Recent proofs</div>
            <section aria-label="Proof feed">
              <ProofWall
                messages={data?.messages ?? []}
                isLoading={isLoading}
                error={error ?? null}
                onRetry={() => void refetch()}
              />
            </section>
          </>
        ) : (
          <div className="mt-8 rounded-xl border border-warning/40 bg-base-200 p-6">
            <p className="text-base-content/80">
              Set <code className="text-sm bg-base-300 px-1.5 py-0.5 rounded">NEXT_PUBLIC_PROOF_WALL_TOPIC_ID</code> or
              create a topic in the{" "}
              <a href="/admin" className="link link-primary font-medium">
                Admin
              </a>{" "}
              page.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
