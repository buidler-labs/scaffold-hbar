"use client";

import { useState } from "react";
import Link from "next/link";
import { proofWallConfig } from "~~/config/proofWallConfig";
import { useCreateToken } from "~~/hooks/useCreateToken";
import { useCreateTopic } from "~~/hooks/useCreateTopic";
import { useHederaSigner } from "~~/hooks/useHederaSigner";

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function AdminPage() {
  const { accountId, isConnected } = useHederaSigner();
  const createTopic = useCreateTopic();
  const createToken = useCreateToken();

  const [topicMemo, setTopicMemo] = useState("Proof Wall");
  const [topicSuccess, setTopicSuccess] = useState<string | null>(null);
  const [topicCopied, setTopicCopied] = useState(false);

  const [tokenName, setTokenName] = useState("ProofBadge");
  const [tokenSymbol, setTokenSymbol] = useState("PROOF");
  const [initialSupply, setInitialSupply] = useState("");
  const [tokenSuccess, setTokenSuccess] = useState<string | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);

  const handleCreateTopic = async () => {
    setTopicSuccess(null);
    setTopicCopied(false);
    try {
      const data = await createTopic.mutateAsync({ memo: topicMemo.trim() || "Proof Wall" });
      setTopicSuccess(data.transactionId);
    } catch {
      // Error state is handled by createTopic.isError.
    }
  };

  const handleCreateToken = async () => {
    setTokenSuccess(null);
    setTokenCopied(false);
    try {
      const data = await createToken.mutateAsync({
        name: tokenName.trim(),
        symbol: tokenSymbol.trim().toUpperCase(),
        initialSupply: initialSupply.trim() || "0",
      });
      setTokenSuccess(data.transactionId);
    } catch {
      // Error state is handled by createToken.isError.
    }
  };

  const handleCopyTopicEnvLine = async () => {
    if (!topicSuccess) return;
    const ok = await copyToClipboard(`NEXT_PUBLIC_PROOF_WALL_TOPIC_ID=${topicSuccess}`);
    setTopicCopied(ok);
    if (ok) setTimeout(() => setTopicCopied(false), 2000);
  };

  const handleCopyTokenEnvLine = async () => {
    if (!tokenSuccess) return;
    const ok = await copyToClipboard(`NEXT_PUBLIC_PROOF_WALL_BADGE_TOKEN_ID=${tokenSuccess}`);
    setTokenCopied(ok);
    if (ok) setTimeout(() => setTokenCopied(false), 2000);
  };

  const envBlock = `NEXT_PUBLIC_PROOF_WALL_TOPIC_ID=0.0.xxxxx
NEXT_PUBLIC_PROOF_WALL_BADGE_TOKEN_ID=0.0.xxxxx
HEDERA_OPERATOR_ID=0.0.xxxxx
HEDERA_OPERATOR_PRIVATE_KEY=...
HEDERA_NETWORK=testnet`;

  return (
    <div className="flex flex-col grow">
      <div className="w-full max-w-2xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
          <p className="text-base-content/70 mt-2">
            Create an HCS topic for the Proof Wall and an HTS fungible token for Proof Badges. Transactions are signed
            by your connected wallet.
          </p>
        </header>

        {!isConnected && (
          <div className="alert alert-warning mb-8 shadow-sm">
            <span>Connect a Hedera wallet to create topics and tokens.</span>
          </div>
        )}

        {isConnected && (
          <div className="alert alert-success mb-8 shadow-sm">
            <span>Wallet connected as {accountId}.</span>
          </div>
        )}

        <div className="space-y-8">
          {/* HCS Topic */}
          <section
            className="rounded-xl border border-base-300 bg-base-100 p-6 shadow-sm"
            aria-labelledby="admin-topic-heading"
          >
            <h2 id="admin-topic-heading" className="text-xl font-semibold mb-1">
              Create HCS topic
            </h2>
            <p className="text-sm text-base-content/60 mb-5">
              A consensus topic stores Proof Wall messages. The memo is visible on explorers.
            </p>
            <div className="flex flex-col gap-4">
              <div className="form-control w-full">
                <label className="label py-1" htmlFor="topic-memo">
                  <span className="label-text font-medium">Topic memo</span>
                </label>
                <input
                  id="topic-memo"
                  type="text"
                  className="input input-bordered w-full"
                  placeholder="Proof Wall"
                  value={topicMemo}
                  onChange={e => setTopicMemo(e.target.value)}
                  disabled={createTopic.isPending || !isConnected}
                />
              </div>
              <button
                type="button"
                className="btn btn-primary w-full sm:w-auto"
                onClick={() => {
                  void handleCreateTopic();
                }}
                disabled={createTopic.isPending || !isConnected}
              >
                {createTopic.isPending ? <span className="loading loading-spinner loading-sm" /> : null}
                {createTopic.isPending ? "Waiting for wallet approval…" : "Create topic"}
              </button>
              {createTopic.isError && (
                <div className="rounded-lg bg-error/10 border border-error/20 px-3 py-2 text-sm text-error">
                  {createTopic.error instanceof Error ? createTopic.error.message : "Create topic failed"}
                </div>
              )}
              {topicSuccess && (
                <div className="rounded-lg bg-success/10 border border-success/20 px-3 py-3 text-sm">
                  <p className="font-medium text-success">Topic created</p>
                  <p className="font-mono break-all mt-1">{topicSuccess}</p>
                  <p className="text-base-content/70 mt-2">
                    Add to <code className="text-xs bg-base-200 px-1 rounded">.env.local</code>:
                  </p>
                  <pre className="mt-1 p-2 rounded bg-base-200 text-xs overflow-x-auto whitespace-pre-wrap break-all">
                    NEXT_PUBLIC_PROOF_WALL_TOPIC_ID={topicSuccess}
                  </pre>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => {
                        void handleCopyTopicEnvLine();
                      }}
                    >
                      {topicCopied ? "Copied!" : "Copy env line"}
                    </button>
                    <a
                      href={`https://hashscan.io/testnet/topic/${topicSuccess}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-sm btn-ghost"
                    >
                      Open on HashScan →
                    </a>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* HTS Token */}
          <section
            className="rounded-xl border border-base-300 bg-base-100 p-6 shadow-sm"
            aria-labelledby="admin-token-heading"
          >
            <h2 id="admin-token-heading" className="text-xl font-semibold mb-1">
              Create HTS badge token
            </h2>
            <p className="text-sm text-base-content/60 mb-5">
              Fungible token with 0 decimals, infinite supply. Treasury is your connected wallet account.
            </p>
            <div className="flex flex-col gap-4">
              <div className="form-control w-full">
                <label className="label py-1" htmlFor="token-name">
                  <span className="label-text font-medium">Token name</span>
                </label>
                <input
                  id="token-name"
                  type="text"
                  className="input input-bordered w-full"
                  placeholder="ProofBadge"
                  value={tokenName}
                  onChange={e => setTokenName(e.target.value)}
                  disabled={createToken.isPending || !isConnected}
                  maxLength={100}
                />
              </div>
              <div className="form-control w-full">
                <label className="label py-1" htmlFor="token-symbol">
                  <span className="label-text font-medium">Symbol</span>
                </label>
                <input
                  id="token-symbol"
                  type="text"
                  className="input input-bordered w-full uppercase"
                  placeholder="PROOF"
                  value={tokenSymbol}
                  onChange={e => setTokenSymbol(e.target.value.replace(/[^a-zA-Z]/g, ""))}
                  disabled={createToken.isPending || !isConnected}
                  maxLength={10}
                />
              </div>
              <div className="form-control w-full">
                <label className="label py-1" htmlFor="token-supply">
                  <span className="label-text font-medium">Initial supply</span>
                </label>
                <input
                  id="token-supply"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="input input-bordered w-full max-w-xs"
                  placeholder="0"
                  value={initialSupply}
                  onChange={e => setInitialSupply(e.target.value.replace(/\D/g, ""))}
                  disabled={createToken.isPending || !isConnected}
                />
              </div>
              <button
                type="button"
                className="btn btn-primary w-full sm:w-auto"
                onClick={() => {
                  void handleCreateToken();
                }}
                disabled={createToken.isPending || !isConnected || !tokenName.trim() || !tokenSymbol.trim()}
              >
                {createToken.isPending ? <span className="loading loading-spinner loading-sm" /> : null}
                {createToken.isPending ? "Waiting for wallet approval…" : "Create badge token"}
              </button>
              {createToken.isError && (
                <div className="rounded-lg bg-error/10 border border-error/20 px-3 py-2 text-sm text-error">
                  {createToken.error instanceof Error ? createToken.error.message : "Create token failed"}
                </div>
              )}
              {tokenSuccess && (
                <div className="rounded-lg bg-success/10 border border-success/20 px-3 py-3 text-sm">
                  <p className="font-medium text-success">Token created</p>
                  <p className="font-mono break-all mt-1">{tokenSuccess}</p>
                  <p className="text-base-content/70 mt-2">
                    Add to <code className="text-xs bg-base-200 px-1 rounded">.env.local</code>:
                  </p>
                  <pre className="mt-1 p-2 rounded bg-base-200 text-xs overflow-x-auto whitespace-pre-wrap break-all">
                    NEXT_PUBLIC_PROOF_WALL_BADGE_TOKEN_ID={tokenSuccess}
                  </pre>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => {
                        void handleCopyTokenEnvLine();
                      }}
                    >
                      {tokenCopied ? "Copied!" : "Copy env line"}
                    </button>
                    <a
                      href={`https://hashscan.io/testnet/token/${tokenSuccess}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-sm btn-ghost"
                    >
                      Open on HashScan →
                    </a>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Current config */}
          <section
            className="rounded-xl border border-base-300 bg-base-100 p-6 text-sm shadow-sm"
            aria-labelledby="admin-config-heading"
          >
            <h2 id="admin-config-heading" className="text-xl font-semibold mb-3">
              Current app config
            </h2>
            <p className="text-base-content/60 mb-3">
              Values from <code className="text-xs bg-base-200 px-1 rounded">NEXT_PUBLIC_*</code> at build time. Restart
              dev server after changing <code className="text-xs bg-base-200 px-1 rounded">.env.local</code>.
            </p>
            <dl className="space-y-2">
              <div>
                <dt className="text-base-content/50 text-xs uppercase tracking-wide">Topic ID</dt>
                <dd>
                  <code className="bg-base-200 px-2 py-1 rounded break-all">
                    {proofWallConfig.topicId || "— not set —"}
                  </code>
                </dd>
              </div>
              <div>
                <dt className="text-base-content/50 text-xs uppercase tracking-wide">Badge token ID</dt>
                <dd>
                  <code className="bg-base-200 px-2 py-1 rounded break-all">
                    {proofWallConfig.badgeTokenId || "— not set —"}
                  </code>
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-base-content/50 text-xs">
              Example <code className="bg-base-200 px-1 rounded">.env.local</code> keys:
            </p>
            <pre className="mt-1 p-3 rounded bg-base-200 text-xs overflow-x-auto whitespace-pre-wrap">{envBlock}</pre>
          </section>

          <p className="text-center text-sm text-base-content/50">
            <Link href="/" className="link link-primary">
              ← Back to Proof Wall
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
