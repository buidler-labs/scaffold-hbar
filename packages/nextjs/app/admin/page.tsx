"use client";

import { useState } from "react";
import Link from "next/link";
import { proofWallConfig } from "~~/config/proofWallConfig";
import { useTargetNetwork } from "~~/hooks/scaffold-hbar";
import { useCreateToken } from "~~/hooks/useCreateToken";
import { useCreateTopic } from "~~/hooks/useCreateTopic";
import { useHederaSigner } from "~~/hooks/useHederaSigner";
import { getHederaNetworkNameFromChainId } from "~~/utils/scaffold-hbar";
import { resolveTokenIdFromTransactionId } from "~~/utils/scaffold-hbar/resolveTokenIdFromTransactionId";
import { resolveTopicIdFromTransactionId } from "~~/utils/scaffold-hbar/resolveTopicIdFromTransactionId";

type TopicState =
  | { status: "idle" }
  | { status: "resolving" }
  | { status: "pending"; message: string }
  | { status: "success"; topicId: string; network: "testnet" | "mainnet" };

type TokenState =
  | { status: "idle" }
  | { status: "resolving" }
  | { status: "pending"; message: string }
  | { status: "success"; tokenId: string; network: "testnet" | "mainnet" };

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
  const { targetNetwork } = useTargetNetwork();
  const createTopic = useCreateTopic();
  const createToken = useCreateToken();

  const [topicMemo, setTopicMemo] = useState("Proof Wall");
  const [topicState, setTopicState] = useState<TopicState>({ status: "idle" });
  const [topicCopied, setTopicCopied] = useState(false);

  const [tokenName, setTokenName] = useState("ProofBadge");
  const [tokenSymbol, setTokenSymbol] = useState("PROOF");
  const [initialSupply, setInitialSupply] = useState("");
  const [tokenState, setTokenState] = useState<TokenState>({ status: "idle" });
  const [tokenCopied, setTokenCopied] = useState(false);

  const handleCreateTopic = async () => {
    setTopicState({ status: "idle" });
    setTopicCopied(false);
    let topicTransactionId: string | null = null;
    try {
      const data = await createTopic.mutateAsync({ memo: topicMemo.trim() || "Proof Wall" });
      topicTransactionId = data.transactionId;
      const network = getHederaNetworkNameFromChainId(targetNetwork.id);
      setTopicState({ status: "resolving" });
      const status = await resolveTopicIdFromTransactionId(data.transactionId, network);
      if (status.topicId) {
        setTopicState({ status: "success", topicId: status.topicId, network });
        return;
      }
      if (status.pending) {
        setTopicState({
          status: "pending",
          message:
            "Topic transaction was submitted. We retried automatically, but Mirror Node is still indexing it. Wait 10-20 seconds, then click Create topic again to resolve it.",
        });
        return;
      }
      setTopicState({
        status: "pending",
        message: "Topic transaction was submitted, but we could not resolve the topic ID from Mirror Node right now.",
      });
    } catch (error) {
      if (!topicTransactionId) {
        return;
      }
      setTopicState({
        status: "pending",
        message:
          error instanceof Error
            ? error.message
            : "Topic transaction was submitted, but we could not resolve the topic ID right now.",
      });
    }
  };

  const handleCreateToken = async () => {
    setTokenState({ status: "idle" });
    setTokenCopied(false);
    let tokenTransactionId: string | null = null;
    try {
      const data = await createToken.mutateAsync({
        name: tokenName.trim(),
        symbol: tokenSymbol.trim().toUpperCase(),
        initialSupply: initialSupply.trim() || "0",
      });
      tokenTransactionId = data.transactionId;
      const network = getHederaNetworkNameFromChainId(targetNetwork.id);
      setTokenState({ status: "resolving" });
      const status = await resolveTokenIdFromTransactionId(data.transactionId, network);
      if (status.tokenId) {
        setTokenState({ status: "success", tokenId: status.tokenId, network });
        return;
      }
      if (status.pending) {
        setTokenState({
          status: "pending",
          message:
            "Token transaction was submitted. We retried automatically, but Mirror Node is still indexing it. Wait 10-20 seconds, then click Create badge token again to resolve it.",
        });
        return;
      }
      setTokenState({
        status: "pending",
        message: "Token transaction was submitted, but we could not resolve the token ID from Mirror Node right now.",
      });
    } catch (error) {
      if (!tokenTransactionId) {
        return;
      }
      setTokenState({
        status: "pending",
        message:
          error instanceof Error
            ? error.message
            : "Token transaction was submitted, but we could not resolve the token ID right now.",
      });
    }
  };

  const handleCopyTopicEnvLine = async () => {
    if (topicState.status !== "success") return;
    const ok = await copyToClipboard(`NEXT_PUBLIC_PROOF_WALL_TOPIC_ID=${topicState.topicId}`);
    setTopicCopied(ok);
    if (ok) setTimeout(() => setTopicCopied(false), 2000);
  };

  const handleCopyTokenEnvLine = async () => {
    if (tokenState.status !== "success") return;
    const ok = await copyToClipboard(`NEXT_PUBLIC_PROOF_WALL_BADGE_TOKEN_ID=${tokenState.tokenId}`);
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
                  disabled={createTopic.isPending || topicState.status === "resolving" || !isConnected}
                />
              </div>
              <button
                type="button"
                className="btn btn-primary w-full sm:w-auto"
                onClick={() => {
                  void handleCreateTopic();
                }}
                disabled={createTopic.isPending || topicState.status === "resolving" || !isConnected}
              >
                {createTopic.isPending || topicState.status === "resolving" ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : null}
                {createTopic.isPending
                  ? "Waiting for wallet approval…"
                  : topicState.status === "resolving"
                    ? "Resolving topic ID…"
                    : "Create topic"}
              </button>
              {createTopic.isError && (
                <div className="rounded-lg bg-error/10 border border-error/20 px-3 py-2 text-sm text-error">
                  {createTopic.error instanceof Error ? createTopic.error.message : "Create topic failed"}
                </div>
              )}
              {topicState.status === "pending" && (
                <div className="rounded-lg bg-info/10 border border-info/20 px-3 py-2 text-sm text-info">
                  {topicState.message}
                </div>
              )}
              {topicState.status === "success" && (
                <div className="rounded-lg bg-success/10 border border-success/20 px-3 py-3 text-sm">
                  <p className="font-medium text-success">Topic created</p>
                  <p className="font-mono break-all mt-1">{topicState.topicId}</p>
                  <p className="text-base-content/70 mt-2">
                    Add to <code className="text-xs bg-base-200 px-1 rounded">.env</code>:
                  </p>
                  <pre className="mt-1 p-2 rounded bg-base-200 text-xs overflow-x-auto whitespace-pre-wrap break-all">
                    NEXT_PUBLIC_PROOF_WALL_TOPIC_ID={topicState.topicId}
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
                      href={`https://hashscan.io/${topicState.network}/topic/${topicState.topicId}`}
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
                  disabled={createToken.isPending || tokenState.status === "resolving" || !isConnected}
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
                  disabled={createToken.isPending || tokenState.status === "resolving" || !isConnected}
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
                  disabled={createToken.isPending || tokenState.status === "resolving" || !isConnected}
                />
              </div>
              <button
                type="button"
                className="btn btn-primary w-full sm:w-auto"
                onClick={() => {
                  void handleCreateToken();
                }}
                disabled={
                  createToken.isPending ||
                  tokenState.status === "resolving" ||
                  !isConnected ||
                  !tokenName.trim() ||
                  !tokenSymbol.trim()
                }
              >
                {createToken.isPending || tokenState.status === "resolving" ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : null}
                {createToken.isPending
                  ? "Waiting for wallet approval…"
                  : tokenState.status === "resolving"
                    ? "Resolving token ID…"
                    : "Create badge token"}
              </button>
              {createToken.isError && (
                <div className="rounded-lg bg-error/10 border border-error/20 px-3 py-2 text-sm text-error">
                  {createToken.error instanceof Error ? createToken.error.message : "Create token failed"}
                </div>
              )}
              {tokenState.status === "pending" && (
                <div className="rounded-lg bg-info/10 border border-info/20 px-3 py-2 text-sm text-info">
                  {tokenState.message}
                </div>
              )}
              {tokenState.status === "success" && (
                <div className="rounded-lg bg-success/10 border border-success/20 px-3 py-3 text-sm">
                  <p className="font-medium text-success">Token created</p>
                  <p className="font-mono break-all mt-1">{tokenState.tokenId}</p>
                  <p className="text-base-content/70 mt-2">
                    Add to <code className="text-xs bg-base-200 px-1 rounded">.env</code>:
                  </p>
                  <pre className="mt-1 p-2 rounded bg-base-200 text-xs overflow-x-auto whitespace-pre-wrap break-all">
                    NEXT_PUBLIC_PROOF_WALL_BADGE_TOKEN_ID={tokenState.tokenId}
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
                      href={`https://hashscan.io/${tokenState.network}/token/${tokenState.tokenId}`}
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
              dev server after changing <code className="text-xs bg-base-200 px-1 rounded">.env</code>.
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
              Example <code className="bg-base-200 px-1 rounded">.env</code> keys:
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
