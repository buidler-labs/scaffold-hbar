"use client";

import React, { useState } from "react";
import { useHederaSigner } from "~~/hooks/useHederaSigner";
import { useSubmitProof } from "~~/hooks/useSubmitProof";

type SubmitProofFormProps = {
  topicId: string;
  onSuccess?: (result: { sequenceNumber?: string }) => void;
};

const MAX_CHARS = 500;

export function SubmitProofForm({ topicId, onSuccess }: SubmitProofFormProps) {
  const [text, setText] = useState("");
  const { accountId, isConnected } = useHederaSigner();
  const submit = useSubmitProof();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      const result = await submit.mutateAsync({
        topicId,
        text: text.trim(),
        author: accountId ?? undefined,
      });
      setText("");
      onSuccess?.(result as { sequenceNumber?: string });
    } catch {
      // Error shown below via submit.isError
    }
  };

  const isPending = submit.isPending;

  return (
    <div className="card border border-base-300 bg-base-100 shadow-sm">
      <div className="card-body p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h2 className="text-lg font-semibold m-0">Post a proof</h2>
          <span className="badge badge-outline badge-primary">HCS</span>
        </div>
        {!isConnected ? (
          <div className="rounded-lg bg-base-200 p-4 text-center text-base-content/70">
            <p className="font-medium">Connect your wallet to post</p>
            <p className="text-sm mt-1">Your address will be recorded as the author of the proof.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="relative">
              <textarea
                className="textarea textarea-bordered w-full min-h-[130px] resize-y text-sm sm:text-base leading-relaxed p-4"
                placeholder={'What do you want to prove? e.g. "I was here", a prediction, a commitment\u2026'}
                value={text}
                onChange={e => setText(e.target.value)}
                maxLength={MAX_CHARS}
                disabled={isPending}
                rows={4}
              />
              <span className="absolute bottom-3 right-4 text-xs text-base-content/40 pointer-events-none">
                {text.length}/{MAX_CHARS}
              </span>
            </div>
            <div className="flex items-center justify-end gap-3">
              {submit.isError && (
                <p className="text-sm text-error mr-auto m-0">
                  {submit.error instanceof Error ? submit.error.message : "Submit failed"}
                </p>
              )}
              {isPending && !submit.isError && (
                <p className="text-xs text-base-content/60 mr-auto m-0">Waiting for wallet approval...</p>
              )}
              <button type="submit" className="btn btn-primary" disabled={!text.trim() || isPending}>
                {isPending ? (
                  <>
                    <span className="loading loading-spinner loading-xs" />
                    Posting&hellip;
                  </>
                ) : (
                  "Post proof"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
