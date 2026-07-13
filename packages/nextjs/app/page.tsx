"use client";

import { useState } from "react";
import Image from "next/image";
import { ProofWall } from "~~/components/ProofWall";
import { SubmitProofForm } from "~~/components/SubmitProofForm";
import { TopicSelector } from "~~/components/TopicSelector";
import { proofWallConfig } from "~~/config/proofWallConfig";
import { useTopicMessages } from "~~/hooks/useTopicMessages";

export default function ProofWallPage() {
  const [topicId, setTopicId] = useState(proofWallConfig.topicId);
  const effectiveTopicId = topicId || proofWallConfig.topicId;
  const { data, isLoading, error, refetch, onNewMessage } = useTopicMessages(effectiveTopicId, {
    refetchInterval: 15_000,
  });

  return (
    <div className="flex flex-col grow">
      <div className="w-full max-w-5xl mx-auto px-4 py-6 sm:py-8">
        <header className="hero rounded-2xl hedera-gradient text-white shadow-lg mb-6 sm:mb-8 overflow-hidden">
          <div className="hero-content w-full flex-col md:flex-row items-start md:items-center justify-between gap-4 py-7 sm:py-8">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight m-0">Proof Wall</h1>
              <p className="text-white/90 mt-2 mb-0 max-w-2xl">
                Post a timestamped proof on Hedera. Every message is an HCS consensus message — permanent and verifiable
                on HashScan.
              </p>
            </div>
            <Image
              src="/Hedera-Icon-White.svg"
              alt="Hedera"
              width={64}
              height={64}
              className="hidden sm:block opacity-90"
            />
          </div>
        </header>

        <div className="stats stats-vertical sm:stats-horizontal w-full shadow-sm border border-base-300 bg-base-100 mb-6">
          <div className="stat">
            <div className="stat-title">Network</div>
            <div className="stat-value text-base sm:text-lg">Hedera Testnet</div>
          </div>
          <div className="stat">
            <div className="stat-title">Topic</div>
            <div className="stat-value text-sm font-mono">{effectiveTopicId || "Not configured"}</div>
          </div>
        </div>

        <div className="card border border-base-300 bg-base-100 shadow-sm mb-6">
          <div className="card-body py-5">
            <h2 className="card-title text-base">Active Topic</h2>
            <TopicSelector topicId={effectiveTopicId} onTopicIdChange={setTopicId} />
          </div>
        </div>

        {effectiveTopicId ? (
          <>
            <section className="mt-6" aria-label="Submit a proof">
              <SubmitProofForm
                topicId={effectiveTopicId}
                onSuccess={result => onNewMessage(result.sequenceNumber ? Number(result.sequenceNumber) : undefined)}
              />
            </section>
            <div className="divider my-8 text-base-content/60">Recent proofs</div>
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
          <div className="mt-6 alert alert-warning shadow-sm">
            <span>
              Set <code className="text-sm bg-base-300 px-1.5 py-0.5 rounded">NEXT_PUBLIC_PROOF_WALL_TOPIC_ID</code> or
              create a topic in the{" "}
              <a href="/admin" className="link link-primary font-medium">
                Admin
              </a>{" "}
              page.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
