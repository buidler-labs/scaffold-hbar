import { useEffect, useState } from "react";
import { chainIdToHederaNetwork, getHederaAccountId } from "~~/utils/scaffold-hbar";

export function useHederaAccountId(evmAddress: string | undefined, chainId?: number) {
  const [accountId, setAccountId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!evmAddress) {
      setAccountId(null);
      return;
    }

    let cancelled = false;
    const network = chainIdToHederaNetwork(chainId ?? 296);

    setIsLoading(true);

    getHederaAccountId(evmAddress, network)
      .then(id => {
        if (!cancelled) setAccountId(id);
      })
      .catch(() => {
        if (!cancelled) setAccountId(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [evmAddress, chainId]);

  return { accountId, isLoading };
}
