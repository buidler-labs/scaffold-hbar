import { useMemo } from "react";
import type { Address } from "viem";
import { useReadContract } from "wagmi";
import { useTargetNetwork } from "~~/hooks/scaffold-hbar/useTargetNetwork";
import { useAllContracts } from "~~/utils/scaffold-hbar/contractsData";

const ownerAbi = [
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
] as const;

type UseDeployedContractOwnerConfig = {
  address?: Address;
  contractName?: string;
  enabled?: boolean;
};

export const useDeployedContractOwner = ({ address, contractName, enabled = true }: UseDeployedContractOwnerConfig) => {
  const { targetNetwork } = useTargetNetwork();
  const contractsData = useAllContracts();
  const deployedContract = contractName ? contractsData[contractName] : undefined;
  const contractAddress = address ?? deployedContract?.address;

  const supportsOwner = useMemo(() => {
    if (!deployedContract) return undefined;

    return deployedContract.abi.some(
      abiItem => abiItem.type === "function" && abiItem.name === "owner" && abiItem.inputs.length === 0,
    );
  }, [deployedContract]);

  const ownerQuery = useReadContract({
    address: contractAddress,
    abi: ownerAbi,
    chainId: targetNetwork.id,
    functionName: "owner",
    query: {
      enabled: enabled && Boolean(contractAddress) && supportsOwner === true,
    },
  });

  return {
    ...ownerQuery,
    owner: ownerQuery.data as Address | undefined,
    supportsOwner,
  };
};
