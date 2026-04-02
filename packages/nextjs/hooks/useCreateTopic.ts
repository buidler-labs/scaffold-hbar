"use client";

import { TopicCreateTransaction } from "@hiero-ledger/sdk";
import { useNativeTransaction } from "@scaffold-ui/hooks";
import { useMutation } from "@tanstack/react-query";
import { useHederaSigner } from "~~/hooks/useHederaSigner";

type CreateTopicParams = { memo?: string };

export function useCreateTopic() {
  const { requireProvider } = useHederaSigner();
  const { sendTransaction } = useNativeTransaction();

  return useMutation({
    mutationFn: async ({ memo }: CreateTopicParams = {}) => {
      requireProvider();
      const tx = new TopicCreateTransaction();
      const normalizedMemo = memo?.trim();
      if (normalizedMemo) tx.setTopicMemo(normalizedMemo);

      const result = await sendTransaction(tx);
      if (!result?.transactionId) throw new Error("No transactionId returned from wallet");
      return { transactionId: result.transactionId };
    },
  });
}
