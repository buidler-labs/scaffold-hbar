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
  const { data, isLoading, error } = useTopicMessages(effectiveTopicId);

  return (
    <div className="flex flex-col grow">
      <div className="w-full max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Proof Wall</h1>
        <p className="text-base-content/70 mb-6">
          Post a timestamped proof on Hedera. Every message is an HCS consensus message.
        </p>

        <TopicSelector topicId={effectiveTopicId} onTopicIdChange={setTopicId} />

        {effectiveTopicId && (
          <>
            <div className="mt-8 mb-6">
              <SubmitProofForm topicId={effectiveTopicId} />
            </div>
            <div className="divider">Recent proofs</div>
            <ProofWall messages={data?.messages ?? []} isLoading={isLoading} error={error ?? null} />
          </>
        )}

        {!effectiveTopicId && (
          <div className="rounded-xl border border-warning/40 bg-base-200 p-6 mt-6">
            <p className="text-base-content/80">
              Set <code className="text-sm bg-base-300 px-1 rounded">NEXT_PUBLIC_PROOF_WALL_TOPIC_ID</code> or create a
              topic in the{" "}
              <a href="/admin" className="link link-primary">
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
