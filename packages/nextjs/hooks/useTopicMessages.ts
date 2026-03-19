"use client";

import { useCallback, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export type TopicMessage = {
  consensus_timestamp?: string;
  sequence_number?: number;
  message?: string;
  [key: string]: unknown;
};

type UseTopicMessagesOptions = {
  enabled?: boolean;
  refetchInterval?: number;
};

export function useTopicMessages(topicId: string | null, options?: UseTopicMessagesOptions) {
  const normalInterval = options?.refetchInterval ?? 15_000;
  const [activeInterval, setActiveInterval] = useState(normalInterval);
  const pendingSeqRef = useRef<number | null>(null);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["topic-messages", topicId],
    queryFn: async () => {
      if (!topicId) return { messages: [] as TopicMessage[] };
      const res = await fetch(`/api/hedera/topic-messages?topicId=${encodeURIComponent(topicId)}`);
      if (!res.ok) throw new Error("Failed to fetch topic messages");
      const data = (await res.json()) as { messages: TopicMessage[] };

      if (pendingSeqRef.current != null) {
        const found = data.messages.some(m => m.sequence_number != null && m.sequence_number >= pendingSeqRef.current!);
        if (found) {
          pendingSeqRef.current = null;
          setActiveInterval(normalInterval);
        }
      }

      return data;
    },
    enabled: (options?.enabled ?? true) && Boolean(topicId),
    refetchInterval: activeInterval,
  });

  const onNewMessage = useCallback(
    (sequenceNumber?: number) => {
      if (sequenceNumber != null) {
        pendingSeqRef.current = sequenceNumber;
      }
      setActiveInterval(3_000);

      setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ["topic-messages", topicId] });
      }, 4_000);

      setTimeout(() => {
        setActiveInterval(prev => (prev === 3_000 ? normalInterval : prev));
        pendingSeqRef.current = null;
      }, 30_000);
    },
    [topicId, normalInterval, queryClient],
  );

  return { ...query, onNewMessage };
}
