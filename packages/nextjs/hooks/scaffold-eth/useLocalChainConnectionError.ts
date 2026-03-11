import { useQuery } from "@tanstack/react-query";
import { hardhat } from "viem/chains";
import { useAccount } from "wagmi";
import { getPublicClient } from "wagmi/actions";
import { getWagmiConfig } from "~~/services/web3/wagmiConfig";

/**
 * Returns true when the user is on the local fork chain and the connection fails
 * (e.g. yarn chain is not running).
 */
export function useLocalChainConnectionError(): boolean {
  const { chain, isConnected } = useAccount();

  const isOnLocalFork = isConnected && chain?.id === hardhat.id;

  const { isError } = useQuery({
    queryKey: ["localChainConnection", chain?.id],
    queryFn: async () => {
      const client = getPublicClient(getWagmiConfig(), { chainId: hardhat.id });
      if (!client) throw new Error("No client");
      await client.getBlockNumber();
      return true;
    },
    enabled: isOnLocalFork,
    retry: false,
    staleTime: 5000,
  });

  return isOnLocalFork && isError;
}
