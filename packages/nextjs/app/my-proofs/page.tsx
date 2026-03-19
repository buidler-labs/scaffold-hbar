"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { BadgeDisplay } from "~~/components/BadgeDisplay";
import { ProofWall } from "~~/components/ProofWall";
import { proofWallConfig } from "~~/config/proofWallConfig";
import type { TopicMessage } from "~~/hooks/useTopicMessages";
import { useTopicMessages } from "~~/hooks/useTopicMessages";

function filterMessagesByAuthor(messages: TopicMessage[], authorAddress: string): TopicMessage[] {
  const lower = authorAddress.toLowerCase();
  return messages.filter(m => {
    try {
      if (typeof m.message !== "string") return false;
      const raw = atob(m.message);
      const payload = JSON.parse(raw) as { author?: string };
      return payload.author?.toLowerCase() === lower;
    } catch {
      return false;
    }
  });
}

export default function MyProofsPage() {
  const { address, status } = useAccount();
  const topicId = proofWallConfig.topicId;
  const { data, isLoading, error, refetch } = useTopicMessages(topicId, {
    enabled: Boolean(topicId),
    refetchInterval: 20_000,
  });

  const allMessages = data?.messages ?? [];
  const myMessages = address ? filterMessagesByAuthor(allMessages, address) : [];
  const isConnected = status === "connected" && address;

  return (
    <div className="flex flex-col grow">
      <div className="w-full max-w-3xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">My Proofs</h1>
          <p className="text-base-content/70 mt-2">Your submitted proofs and Proof Badge balance.</p>
        </header>

        {!isConnected ? (
          <div className="rounded-xl border border-base-300 bg-base-100 p-8 text-center">
            <p className="text-base-content/70 font-medium">Connect your wallet</p>
            <p className="text-base-content/50 text-sm mt-1">Your proofs and badge balance will appear here.</p>
          </div>
        ) : !topicId ? (
          <div className="rounded-xl border border-warning/40 bg-base-200 p-6">
            <p className="text-base-content/80">
              No topic configured. Set{" "}
              <code className="text-sm bg-base-300 px-1.5 py-0.5 rounded">NEXT_PUBLIC_PROOF_WALL_TOPIC_ID</code> or
              create one in{" "}
              <Link href="/admin" className="link link-primary">
                Admin
              </Link>
              .
            </p>
          </div>
        ) : (
          <>
            <section className="mb-8" aria-label="Badge balance">
              <BadgeDisplay accountIdOrEvm={address} variant="card" />
            </section>

            <div className="divider my-8">Your proofs</div>

            <section aria-label="Your proof feed">
              <div className="mb-4 flex items-center justify-between gap-2">
                <p className="text-sm text-base-content/60">
                  {!isLoading && !error && myMessages.length > 0
                    ? `${myMessages.length} proof${myMessages.length === 1 ? "" : "s"}`
                    : null}
                </p>
              </div>
              <ProofWall
                messages={myMessages}
                isLoading={isLoading}
                error={error ?? null}
                onRetry={() => void refetch()}
                emptyTitle="You haven't posted any proofs yet."
                emptyDescription="Post your first proof on the Proof Wall — it'll show up here."
                emptyAction={
                  <Link href="/" className="btn btn-primary btn-sm">
                    Go to Proof Wall
                  </Link>
                }
              />
            </section>
          </>
        )}
      </div>
    </div>
  );
}
