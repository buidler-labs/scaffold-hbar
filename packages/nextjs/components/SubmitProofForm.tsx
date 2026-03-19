"use client";

import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { useSubmitProof } from "~~/hooks/useSubmitProof";

type SubmitProofFormProps = {
  topicId: string;
};

const MAX_CHARS = 500;

export function SubmitProofForm({ topicId }: SubmitProofFormProps) {
  const [text, setText] = useState("");
  const { address, status } = useAccount();
  const queryClient = useQueryClient();
  const submit = useSubmitProof();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      await submit.mutateAsync({
        topicId,
        text: text.trim(),
        author: address ?? undefined,
      });
      setText("");
      await queryClient.invalidateQueries({ queryKey: ["topic-messages", topicId] });
    } catch {
      // Error shown below via submit.isError
    }
  };

  const isConnected = status === "connected" && address;
  const isPending = submit.isPending;

  return (
    <div className="rounded-xl border border-base-300 bg-base-100 p-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-4">Post a proof</h2>
      {!isConnected ? (
        <div className="rounded-lg bg-base-200 p-4 text-center text-base-content/70">
          <p className="font-medium">Connect your wallet to post</p>
          <p className="text-sm mt-1">Your address will be recorded as the author of the proof.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <textarea
            className="textarea textarea-bordered w-full min-h-[120px] resize-y"
            placeholder="What do you want to prove? e.g. “I was here”, a prediction, a commitment…"
            value={text}
            onChange={e => setText(e.target.value)}
            maxLength={MAX_CHARS}
            disabled={isPending}
            rows={4}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-base-content/50">
              {text.length}/{MAX_CHARS}
            </span>
            <button type="submit" className="btn btn-primary" disabled={!text.trim() || isPending}>
              {isPending ? "Posting…" : "Post proof"}
            </button>
          </div>
          {submit.isError && (
            <p className="text-sm text-error">
              {submit.error instanceof Error ? submit.error.message : "Submit failed"}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
