"use client";

import { useCreateToken as useCreateTokenFromScaffoldHbarUi } from "@scaffold-hbar-ui/hooks";
import { useHederaSigner } from "~~/hooks/useHederaSigner";

export function useCreateToken() {
  const { requireProvider } = useHederaSigner();
  return useCreateTokenFromScaffoldHbarUi({
    getTreasuryAccountId: () => requireProvider().accountId,
  });
}
