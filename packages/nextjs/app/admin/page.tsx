"use client";

import { useState } from "react";
import { proofWallConfig } from "~~/config/proofWallConfig";

export default function AdminPage() {
  const [topicMemo, setTopicMemo] = useState("");
  const [createTopicStatus, setCreateTopicStatus] = useState<string | null>(null);
  const [tokenName, setTokenName] = useState("ProofBadge");
  const [tokenSymbol, setTokenSymbol] = useState("PROOF");
  const [createTokenStatus, setCreateTokenStatus] = useState<string | null>(null);

  const handleCreateTopic = async () => {
    setCreateTopicStatus("Creating…");
    try {
      const res = await fetch("/api/hedera/create-topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memo: topicMemo || "Proof Wall" }),
      });
      const data = (await res.json()) as { topicId?: string; error?: string };
      if (!res.ok) {
        setCreateTopicStatus(data.error ?? "Failed");
        return;
      }
      setCreateTopicStatus(`Created topic: ${data.topicId}. Set NEXT_PUBLIC_PROOF_WALL_TOPIC_ID=${data.topicId}`);
    } catch (e) {
      setCreateTopicStatus(String(e));
    }
  };

  const handleCreateToken = async () => {
    setCreateTokenStatus("Creating…");
    try {
      const res = await fetch("/api/hedera/create-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tokenName, symbol: tokenSymbol, initialSupply: "0" }),
      });
      const data = (await res.json()) as { tokenId?: string; error?: string };
      if (!res.ok) {
        setCreateTokenStatus(data.error ?? "Failed");
        return;
      }
      setCreateTokenStatus(`Created token: ${data.tokenId}. Set NEXT_PUBLIC_PROOF_WALL_BADGE_TOKEN_ID=${data.tokenId}`);
    } catch (e) {
      setCreateTokenStatus(String(e));
    }
  };

  return (
    <div className="flex flex-col grow">
      <div className="w-full max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Admin</h1>
        <p className="text-base-content/70 mb-8">
          Create HCS topic and HTS badge token for the Proof Wall. Requires operator key in env.
        </p>

        <div className="space-y-8">
          <div className="rounded-xl border border-base-300 bg-base-100 p-6">
            <h2 className="text-xl font-semibold mb-4">Create HCS Topic</h2>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="Topic memo (optional)"
                value={topicMemo}
                onChange={e => setTopicMemo(e.target.value)}
              />
              <button type="button" className="btn btn-primary" onClick={handleCreateTopic}>
                Create topic
              </button>
              {createTopicStatus && <p className="text-sm text-base-content/80 break-all">{createTopicStatus}</p>}
            </div>
          </div>

          <div className="rounded-xl border border-base-300 bg-base-100 p-6">
            <h2 className="text-xl font-semibold mb-4">Create HTS Badge Token</h2>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="Token name"
                value={tokenName}
                onChange={e => setTokenName(e.target.value)}
              />
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="Symbol"
                value={tokenSymbol}
                onChange={e => setTokenSymbol(e.target.value)}
              />
              <button type="button" className="btn btn-primary" onClick={handleCreateToken}>
                Create token
              </button>
              {createTokenStatus && <p className="text-sm text-base-content/80 break-all">{createTokenStatus}</p>}
            </div>
          </div>

          <div className="rounded-xl border border-base-300 bg-base-100 p-6 text-sm">
            <h2 className="text-xl font-semibold mb-2">Current config</h2>
            <p>
              Topic ID: <code className="bg-base-200 px-1 rounded">{proofWallConfig.topicId || "—"}</code>
            </p>
            <p>
              Badge Token ID: <code className="bg-base-200 px-1 rounded">{proofWallConfig.badgeTokenId || "—"}</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
