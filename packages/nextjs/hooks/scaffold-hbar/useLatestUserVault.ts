import { Address, zeroAddress } from "viem";
import { useAccount } from "wagmi";
import { useScaffoldReadContract } from "~~/hooks/scaffold-hbar";

export const useLatestUserVault = () => {
  const { address } = useAccount();

  const {
    data: latestVault,
    isLoading,
    isError,
  } = useScaffoldReadContract({
    contractName: "ScheduledVaultFactory",
    functionName: "getLatestUserVault",
    args: [address],
    watch: false,
    query: {
      enabled: !!address,
      retry: false,
    },
  });

  const raw = latestVault as Address | undefined;
  const vaultAddress = raw && raw !== zeroAddress ? raw : undefined;
  const hasVault = !!vaultAddress;

  return {
    vaultAddress: hasVault ? vaultAddress : undefined,
    hasVault,
    isLoading: isLoading && !isError,
  };
};
