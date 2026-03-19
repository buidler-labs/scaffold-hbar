"use client";

import { useMutation } from "@tanstack/react-query";

type SubmitProofParams = {
  topicId: string;
  text: string;
  author?: string;
};

export function useSubmitProof() {
  return useMutation({
    mutationFn: async (params: SubmitProofParams) => {
      const res = await fetch("/api/hedera/submit-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submit failed");
      return data;
    },
  });
}
