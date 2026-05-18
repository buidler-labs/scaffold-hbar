import { useEffect, useState } from "react";
import { useTargetNetwork } from "./useTargetNetwork";
import { Address, Log } from "viem";
import { usePublicClient } from "wagmi";
import deployedContracts from "~~/contracts/deployedContracts";
import { GenericContractsDeclaration } from "~~/utils/scaffold-hbar/contract";

function getDeployedOnBlock(chainId: number, address: Address): bigint {
  const contracts = deployedContracts as GenericContractsDeclaration | null;
  if (!contracts?.[chainId]) return 0n;

  for (const contractInfo of Object.values(contracts[chainId])) {
    if (contractInfo.address.toLowerCase() === address.toLowerCase() && contractInfo.deployedOnBlock) {
      return BigInt(contractInfo.deployedOnBlock);
    }
  }
  return 0n;
}

export const useContractLogs = (address: Address) => {
  const [logs, setLogs] = useState<Log[]>([]);
  const { targetNetwork } = useTargetNetwork();
  const client = usePublicClient({ chainId: targetNetwork.id });

  useEffect(() => {
    const fetchLogs = async () => {
      if (!client) return console.error("Client not found");
      try {
        const startBlock = getDeployedOnBlock(targetNetwork.id, address);
        const existingLogs = await client.getLogs({
          address: address,
          fromBlock: startBlock,
          toBlock: "latest",
        });
        setLogs(existingLogs);
      } catch (error) {
        console.error("Failed to fetch logs:", error);
      }
    };
    fetchLogs();

    return client?.watchBlockNumber({
      onBlockNumber: async (_blockNumber, prevBlockNumber) => {
        const newLogs = await client.getLogs({
          address: address,
          fromBlock: prevBlockNumber,
          toBlock: "latest",
        });
        setLogs(prevLogs => [...prevLogs, ...newLogs]);
      },
    });
  }, [address, client, targetNetwork.id]);

  return logs;
};
