"use client";

import { useCreateTopic as useCreateTopicFromScaffoldHbarUi } from "@scaffold-hbar-ui/hooks";
import { useHederaSigner } from "~~/hooks/useHederaSigner";

export function useCreateTopic() {
  const { requireProvider } = useHederaSigner();
  return useCreateTopicFromScaffoldHbarUi({
    ensureReady: () => {
      requireProvider();
    },
  });
}
