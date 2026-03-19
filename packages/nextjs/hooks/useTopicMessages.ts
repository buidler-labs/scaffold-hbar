"use client";

import { useQuery } from "@tanstack/react-query";

export type TopicMessage = {
  consensus_timestamp?: string;
  sequence_number?: number;
  message?: string;
  [key: string]: unknown;
};

export function useTopicMessages(topicId: string | null, options?: { enabled?: boolean; refetchInterval?: number }) {
  return useQuery({
    queryKey: ["topic-messages", topicId],
    queryFn: async () => {
      if (!topicId) return { messages: [] };
      const res = await fetch(`/api/hedera/topic-messages?topicId=${encodeURIComponent(topicId)}`);
      if (!res.ok) throw new Error("Failed to fetch topic messages");
      const data = (await res.json()) as { messages: TopicMessage[] };
      return data;
    },
    enabled: (options?.enabled ?? true) && Boolean(topicId),
    refetchInterval: options?.refetchInterval ?? 10_000,
  });
}
