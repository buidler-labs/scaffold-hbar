import { Address } from "viem";
import { useAccount } from "wagmi";
import { useScaffoldReadContract } from "~~/hooks/scaffold-hbar";

export const useUserVaults = () => {
  const { address } = useAccount();

  const {
    data: firstVault,
    isLoading,
    isError,
  } = useScaffoldReadContract({
    contractName: "ScheduledVaultFactory",
    functionName: "userVaults",
    args: [address, 0n],
    query: { enabled: !!address },
  });

  // userVaults(addr, 0) reverts when the array is empty (out-of-bounds),
  // so an error means the user simply has no vaults yet.
  const vaultAddress = firstVault as Address | undefined;
  const hasVault = !!vaultAddress;

  return {
    vaultAddress: hasVault ? vaultAddress : undefined,
    hasVault,
    isLoading: isLoading && !isError,
  };
};
