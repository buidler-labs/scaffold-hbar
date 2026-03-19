"use client";

import { useQuery } from "@tanstack/react-query";

/**
 * Query HTS badge token balance for an account.
 * Resolves EVM address to Hedera accountId via /api/hedera/account, then fetches token balance via API.
 */
export function useBadgeTokens(tokenId: string | null, accountIdOrEvm: string | null) {
  return useQuery({
    queryKey: ["badge-tokens", tokenId, accountIdOrEvm],
    queryFn: async () => {
      if (!tokenId || !accountIdOrEvm) return null;
      const isEvm = accountIdOrEvm.startsWith("0x");
      let accountId: string | null;
      if (isEvm) {
        const res = await fetch(`/api/hedera/account?evm=${encodeURIComponent(accountIdOrEvm)}&network=testnet`);
        if (!res.ok) return null;
        const data = (await res.json()) as { accountId: string | null };
        accountId = data.accountId;
      } else {
        accountId = accountIdOrEvm;
      }
      if (!accountId) return null;
      const balanceRes = await fetch(
        `/api/hedera/token-balance?tokenId=${encodeURIComponent(tokenId)}&accountId=${encodeURIComponent(accountId)}&network=testnet`,
      );
      if (!balanceRes.ok) return null;
      const balanceData = (await balanceRes.json()) as { balance?: number };
      return { accountId, balance: balanceData.balance ?? 0 };
    },
    enabled: Boolean(tokenId && accountIdOrEvm),
  });
}
