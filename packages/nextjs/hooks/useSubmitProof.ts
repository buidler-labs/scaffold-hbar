"use client";

import { TopicId, TopicMessageSubmitTransaction } from "@hiero-ledger/sdk";
import { useMutation } from "@tanstack/react-query";
import { useHederaSigner } from "~~/hooks/useHederaSigner";
import { extractIdentity, hederaCaipId } from "~~/utils/scaffold-hbar/hederaIdentity";
import { transactionToBase64String } from "~~/utils/scaffold-hbar/hederaTxUtils";

type SubmitProofParams = {
  topicId: string;
  text: string;
  author?: string;
};

const MAX_MESSAGE_BYTES = 1024;
const TOPIC_ID_REGEX = /^\d+\.\d+\.\d+$/;

export function useSubmitProof() {
  const { requireProvider, accountId } = useHederaSigner();

  return useMutation({
    mutationFn: async (params: SubmitProofParams) => {
      const { provider, accountId: connectedId } = requireProvider();

      const topicId = params.topicId?.trim();
      const text = params.text?.trim();

      if (!topicId || !TOPIC_ID_REGEX.test(topicId)) throw new Error("Invalid topicId: expected 0.0.xxxxx");
      if (!text) throw new Error("text cannot be empty");

      const authorId = extractIdentity(params.author ?? accountId ?? connectedId);
      const payload = JSON.stringify({ text, author: authorId, timestamp: Date.now() });
      if (new TextEncoder().encode(payload).length > MAX_MESSAGE_BYTES) {
        throw new Error(`Message too long (max ${MAX_MESSAGE_BYTES} bytes)`);
      }

      const tx = new TopicMessageSubmitTransaction().setTopicId(TopicId.fromString(topicId)).setMessage(payload);

      const result = await provider.hedera_signAndExecuteTransaction({
        signerAccountId: hederaCaipId(connectedId),
        transactionList: transactionToBase64String(tx),
      });

      // Best-effort server-side badge check
      void fetch("/api/hedera/check-badge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId, author: authorId }),
      }).catch(() => undefined);

      return { transactionId: result?.transactionId ?? null, topicId };
    },
  });
}
