import { ZERO_ADDRESS } from "../constants";
import { useAccount } from "wagmi";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

export const useUserVault = () => {
  const { address } = useAccount();

  const {
    data: vaultAddress,
    isLoading,
    refetch,
  } = useScaffoldReadContract({
    contractName: "MemejobDCAFactory",
    functionName: "userVault",
    args: [address],
  });

  const hasVault = !!vaultAddress && vaultAddress !== ZERO_ADDRESS;

  return {
    vaultAddress: hasVault ? vaultAddress : undefined,
    hasVault,
    isLoading,
    refetch,
  };
};
