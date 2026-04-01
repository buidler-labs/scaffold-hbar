"use client";

import { TopicCreateTransaction } from "@hiero-ledger/sdk";
import { useMutation } from "@tanstack/react-query";
import { useHederaSigner } from "~~/hooks/useHederaSigner";
import { hederaCaipId } from "~~/utils/scaffold-hbar/hederaIdentity";
import { transactionToBase64String } from "~~/utils/scaffold-hbar/hederaTxUtils";

type CreateTopicParams = { memo?: string };

export function useCreateTopic() {
  const { requireProvider } = useHederaSigner();

  return useMutation({
    mutationFn: async ({ memo }: CreateTopicParams = {}) => {
      const { provider, accountId } = requireProvider();
      const tx = new TopicCreateTransaction();
      const normalizedMemo = memo?.trim();
      if (normalizedMemo) tx.setTopicMemo(normalizedMemo);

      const result = await provider.hedera_signAndExecuteTransaction({
        signerAccountId: hederaCaipId(accountId),
        transactionList: transactionToBase64String(tx),
      });

      if (!result?.transactionId) throw new Error("No transactionId returned from wallet");
      return { transactionId: result.transactionId };
    },
  });
}
