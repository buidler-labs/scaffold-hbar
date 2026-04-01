"use client";

import { useQuery } from "@tanstack/react-query";
import { extractIdentity } from "~~/utils/scaffold-hbar/hederaIdentity";
import { isEvmAddress, isHederaAccountId } from "~~/utils/scaffold-hbar/identity";

/**
 * Query HTS badge token balance for an account.
 * Resolves EVM address to Hedera accountId via /api/hedera/account, then fetches token balance via API.
 */
export function useBadgeTokens(tokenId: string | null, accountIdOrEvm: string | null) {
  const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK ?? "testnet";

  return useQuery({
    queryKey: ["badge-tokens", tokenId, accountIdOrEvm],
    queryFn: async () => {
      if (!tokenId || !accountIdOrEvm) return null;
      const identity = extractIdentity(accountIdOrEvm);
      let accountId: string | null;
      if (isEvmAddress(identity)) {
        const res = await fetch(
          `/api/hedera/account?evm=${encodeURIComponent(identity)}&network=${encodeURIComponent(network)}`,
        );
        if (!res.ok) return null;
        const data = (await res.json()) as { accountId: string | null };
        accountId = data.accountId;
      } else if (isHederaAccountId(identity)) {
        accountId = identity;
      } else {
        return null;
      }
      if (!accountId) return null;
      const balanceRes = await fetch(
        `/api/hedera/token-balance?tokenId=${encodeURIComponent(tokenId)}&accountId=${encodeURIComponent(accountId)}&network=${encodeURIComponent(network)}`,
      );
      if (!balanceRes.ok) return null;
      const balanceData = (await balanceRes.json()) as { balance?: number };
      return { accountId, balance: balanceData.balance ?? 0 };
    },
    enabled: Boolean(tokenId && accountIdOrEvm),
  });
}
