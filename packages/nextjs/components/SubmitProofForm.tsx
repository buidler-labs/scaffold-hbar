"use client";

import React, { useState } from "react";
import { useAccount } from "wagmi";
import { useSubmitProof } from "~~/hooks/useSubmitProof";

type SubmitProofFormProps = {
  topicId: string;
};

export function SubmitProofForm({ topicId }: SubmitProofFormProps) {
  const [text, setText] = useState("");
  const { address } = useAccount();
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
    } catch {
      // Error surfaced via mutation state / toast
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <textarea
        className="textarea textarea-bordered w-full min-h-[100px]"
        placeholder="Your proof message..."
        value={text}
        onChange={e => setText(e.target.value)}
        maxLength={500}
        disabled={!address || submit.isPending}
      />
      <button type="submit" className="btn btn-primary" disabled={!address || !text.trim() || submit.isPending}>
        {submit.isPending ? "Posting…" : "Post proof"}
      </button>
      {submit.isError && (
        <p className="text-sm text-error">{submit.error instanceof Error ? submit.error.message : "Submit failed"}</p>
      )}
    </form>
  );
}
