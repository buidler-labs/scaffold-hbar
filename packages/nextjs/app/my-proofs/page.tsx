"use client";

import { useAccount } from "wagmi";
import { BadgeDisplay } from "~~/components/BadgeDisplay";
import { ProofWall } from "~~/components/ProofWall";
import { proofWallConfig } from "~~/config/proofWallConfig";
import { useTopicMessages } from "~~/hooks/useTopicMessages";

export default function MyProofsPage() {
  const { address, status } = useAccount();
  const topicId = proofWallConfig.topicId;
  const { data, isLoading, error } = useTopicMessages(topicId);

  const messages = (data?.messages ?? []).filter(m => {
    try {
      if (typeof m.message !== "string") return false;
      const raw = atob(m.message);
      const payload = JSON.parse(raw) as { author?: string };
      return address && payload.author?.toLowerCase() === address.toLowerCase();
    } catch {
      return false;
    }
  });

  const isConnected = status === "connected" && address;

  return (
    <div className="flex flex-col grow">
      <div className="w-full max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">My Proofs</h1>
        <p className="text-base-content/70 mb-6">Your submitted proofs and badge balance.</p>

        {!isConnected ? (
          <div className="rounded-xl border border-base-300 bg-base-100 p-6 text-center text-base-content/70">
            Connect your wallet to see your proofs.
          </div>
        ) : (
          <>
            <div className="mb-6">
              <BadgeDisplay accountIdOrEvm={address} />
            </div>
            <ProofWall messages={messages} isLoading={isLoading} error={error ?? null} />
          </>
        )}
      </div>
    </div>
  );
}
