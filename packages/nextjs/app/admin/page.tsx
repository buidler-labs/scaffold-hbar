"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { proofWallConfig } from "~~/config/proofWallConfig";

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function AdminPage() {
  const [operatorConfigured, setOperatorConfigured] = useState<boolean | null>(null);

  const [topicMemo, setTopicMemo] = useState("Proof Wall");
  const [topicLoading, setTopicLoading] = useState(false);
  const [topicError, setTopicError] = useState<string | null>(null);
  const [topicSuccess, setTopicSuccess] = useState<string | null>(null);
  const [topicCopied, setTopicCopied] = useState(false);

  const [tokenName, setTokenName] = useState("ProofBadge");
  const [tokenSymbol, setTokenSymbol] = useState("PROOF");
  const [initialSupply, setInitialSupply] = useState("0");
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [tokenSuccess, setTokenSuccess] = useState<string | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);

  useEffect(() => {
    void fetch("/api/hedera/operator-status")
      .then(r => r.json())
      .then((d: { operatorConfigured?: boolean }) => setOperatorConfigured(Boolean(d.operatorConfigured)))
      .catch(() => setOperatorConfigured(false));
  }, []);

  const handleCreateTopic = useCallback(async () => {
    setTopicLoading(true);
    setTopicError(null);
    setTopicSuccess(null);
    setTopicCopied(false);
    try {
      const res = await fetch("/api/hedera/create-topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memo: topicMemo.trim() || "Proof Wall" }),
      });
      const data = (await res.json()) as { topicId?: string; error?: string };
      if (!res.ok) {
        setTopicError(data.error ?? `Request failed (${res.status})`);
        return;
      }
      if (!data.topicId) {
        setTopicError("No topic ID returned");
        return;
      }
      setTopicSuccess(data.topicId);
    } catch (e) {
      setTopicError(e instanceof Error ? e.message : String(e));
    } finally {
      setTopicLoading(false);
    }
  }, [topicMemo]);

  const handleCreateToken = useCallback(async () => {
    setTokenLoading(true);
    setTokenError(null);
    setTokenSuccess(null);
    setTokenCopied(false);
    try {
      const res = await fetch("/api/hedera/create-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tokenName.trim(),
          symbol: tokenSymbol.trim().toUpperCase(),
          initialSupply: initialSupply.trim() || "0",
        }),
      });
      const data = (await res.json()) as { tokenId?: string; error?: string };
      if (!res.ok) {
        setTokenError(data.error ?? `Request failed (${res.status})`);
        return;
      }
      if (!data.tokenId) {
        setTokenError("No token ID returned");
        return;
      }
      setTokenSuccess(data.tokenId);
    } catch (e) {
      setTokenError(e instanceof Error ? e.message : String(e));
    } finally {
      setTokenLoading(false);
    }
  }, [tokenName, tokenSymbol, initialSupply]);

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
            with the server-side operator key.
          </p>
        </header>

        {operatorConfigured === false && (
          <div className="alert alert-warning mb-8 shadow-sm">
            <span>
              Operator key is not configured. Add{" "}
              <code className="text-xs bg-base-200 px-1 rounded">HEDERA_OPERATOR_ID</code> and{" "}
              <code className="text-xs bg-base-200 px-1 rounded">HEDERA_OPERATOR_PRIVATE_KEY</code> to{" "}
              <code className="text-xs bg-base-200 px-1 rounded">packages/nextjs/.env.local</code>, then restart the dev
              server.
            </span>
          </div>
        )}

        {operatorConfigured === true && (
          <div className="alert alert-success mb-8 shadow-sm">
            <span>Operator key is configured — you can create topics and tokens.</span>
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
                  disabled={topicLoading}
                />
              </div>
              <button
                type="button"
                className="btn btn-primary w-full sm:w-auto"
                onClick={handleCreateTopic}
                disabled={topicLoading}
              >
                {topicLoading ? <span className="loading loading-spinner loading-sm" /> : null}
                {topicLoading ? "Creating…" : "Create topic"}
              </button>
              {topicError && (
                <div className="rounded-lg bg-error/10 border border-error/20 px-3 py-2 text-sm text-error">
                  {topicError}
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
                      onClick={async () => {
                        const ok = await copyToClipboard(`NEXT_PUBLIC_PROOF_WALL_TOPIC_ID=${topicSuccess}`);
                        setTopicCopied(ok);
                        if (ok) setTimeout(() => setTopicCopied(false), 2000);
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
              Fungible token with 0 decimals, infinite supply. Treasury is your operator account — mint or airdrop from
              there later.
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
                  disabled={tokenLoading}
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
                  disabled={tokenLoading}
                  maxLength={10}
                />
              </div>
              <div className="form-control w-full">
                <label className="label py-1" htmlFor="token-supply">
                  <span className="label-text font-medium">Initial supply</span>
                </label>
                <input
                  id="token-supply"
                  type="number"
                  min={0}
                  step={1}
                  className="input input-bordered w-full max-w-xs"
                  placeholder="0"
                  value={initialSupply}
                  onChange={e => setInitialSupply(e.target.value.replace(/\D/g, "") || "0")}
                  disabled={tokenLoading}
                />
              </div>
              <button
                type="button"
                className="btn btn-primary w-full sm:w-auto"
                onClick={handleCreateToken}
                disabled={tokenLoading || !tokenName.trim() || !tokenSymbol.trim()}
              >
                {tokenLoading ? <span className="loading loading-spinner loading-sm" /> : null}
                {tokenLoading ? "Creating…" : "Create badge token"}
              </button>
              {tokenError && (
                <div className="rounded-lg bg-error/10 border border-error/20 px-3 py-2 text-sm text-error">
                  {tokenError}
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
                      onClick={async () => {
                        const ok = await copyToClipboard(`NEXT_PUBLIC_PROOF_WALL_BADGE_TOKEN_ID=${tokenSuccess}`);
                        setTokenCopied(ok);
                        if (ok) setTimeout(() => setTokenCopied(false), 2000);
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
