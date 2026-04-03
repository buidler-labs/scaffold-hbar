import { QueryClient } from "@tanstack/react-query";

/** After vault-related txs, refresh reads + native balance used by `useBalance`. */
export const invalidateVaultQueries = (queryClient: QueryClient) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: ["readContract"] }),
    queryClient.invalidateQueries({ queryKey: ["balance"] }),
  ]);
