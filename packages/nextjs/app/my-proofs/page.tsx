"use client";

import Link from "next/link";
import { BadgeDisplay } from "~~/components/BadgeDisplay";
import { ProofWall } from "~~/components/ProofWall";
import { proofWallConfig } from "~~/config/proofWallConfig";
import { useHederaSigner } from "~~/hooks/useHederaSigner";
import type { TopicMessage } from "~~/hooks/useTopicMessages";
import { useTopicMessages } from "~~/hooks/useTopicMessages";
import { normalizeIdentity } from "~~/utils/scaffold-hbar/identity";

function filterMessagesByAuthor(messages: TopicMessage[], authors: string[]): TopicMessage[] {
  const normalizedAuthors = authors.map(normalizeIdentity).filter(Boolean);
  return messages.filter(m => {
    try {
      if (typeof m.message !== "string") return false;
      const raw = atob(m.message);
      const payload = JSON.parse(raw) as { author?: string };
      const author = normalizeIdentity(payload.author);
      return Boolean(author && normalizedAuthors.includes(author));
    } catch {
      return false;
    }
  });
}

export default function MyProofsPage() {
  const { accountId, isConnected } = useHederaSigner();
  const address = accountId;
  const topicId = proofWallConfig.topicId;
  const { data, isLoading, error, refetch } = useTopicMessages(topicId, {
    enabled: Boolean(topicId),
    refetchInterval: 20_000,
  });

  const allMessages = data?.messages ?? [];
  const authorCandidates = [address, accountId].filter((value): value is string => Boolean(value));
  const myMessages = authorCandidates.length > 0 ? filterMessagesByAuthor(allMessages, authorCandidates) : [];
  const badgeLookupIdentity = accountId ?? address ?? "";

  return (
    <div className="flex flex-col grow">
      <div className="w-full max-w-5xl mx-auto px-4 py-6 sm:py-8">
        <header className="rounded-2xl border border-base-300 bg-base-100 p-6 sm:p-8 shadow-sm mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight m-0">My Proofs</h1>
          <p className="text-base-content/70 mt-2 mb-0">Your submitted proofs and Proof Badge balance.</p>
        </header>

        {!isConnected ? (
          <div className="card border border-base-300 bg-base-100 shadow-sm">
            <div className="card-body items-center text-center py-10">
              <p className="text-base-content/70 font-medium">Connect your wallet</p>
              <p className="text-base-content/50 text-sm mt-1">Your proofs and badge balance will appear here.</p>
            </div>
          </div>
        ) : !topicId ? (
          <div className="alert alert-warning shadow-sm">
            <span className="text-base-content/80">
              No topic configured. Set{" "}
              <code className="text-sm bg-base-300 px-1.5 py-0.5 rounded">NEXT_PUBLIC_PROOF_WALL_TOPIC_ID</code> or
              create one in{" "}
              <Link href="/admin" className="link link-primary">
                Admin
              </Link>
              .
            </span>
          </div>
        ) : (
          <>
            <section className="mb-8" aria-label="Badge balance">
              <BadgeDisplay accountIdOrEvm={badgeLookupIdentity} variant="card" proofCount={myMessages.length} />
            </section>

            <div className="divider my-8 text-base-content/60">Your proofs</div>

            <section aria-label="Your proof feed">
              <div className="mb-4 flex items-center justify-between gap-2 px-1">
                <p className="text-sm text-base-content/60 font-medium">
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
