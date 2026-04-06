"use client";

import { useCreateTopic as useCreateTopicFromScaffoldUi } from "@scaffold-ui/hooks";
import { useHederaSigner } from "~~/hooks/useHederaSigner";

export function useCreateTopic() {
  const { requireProvider } = useHederaSigner();
  return useCreateTopicFromScaffoldUi({
    ensureReady: () => {
      requireProvider();
    },
  });
}
