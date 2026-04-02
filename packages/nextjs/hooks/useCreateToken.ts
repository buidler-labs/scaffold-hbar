"use client";

import { useCreateToken as useCreateTokenFromScaffoldUi } from "@scaffold-ui/hooks";
import { useHederaSigner } from "~~/hooks/useHederaSigner";

export function useCreateToken() {
  const { requireProvider } = useHederaSigner();
  return useCreateTokenFromScaffoldUi({
    getTreasuryAccountId: () => requireProvider().accountId,
  });
}
