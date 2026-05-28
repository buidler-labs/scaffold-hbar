"use client";

import { useMemo, useState } from "react";
import type { Abi, Address } from "viem";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { OracleDeploymentStatus } from "~~/components/oracle/OracleDeploymentStatus";
import { OracleProviderSelector } from "~~/components/oracle/OracleProviderSelector";
import { OracleQuoteGrid } from "~~/components/oracle/OracleQuoteGrid";
import { useTargetNetwork, useTransactor } from "~~/hooks/scaffold-hbar";
import {
  ORACLE_CONSUMER_CONTRACT_NAME,
  ORACLE_PROVIDERS,
  type OracleProviderId,
  getOracleProvider,
} from "~~/services/oracle";
import { useAllContracts } from "~~/utils/scaffold-hbar/contractsData";

export const OracleDashboard = () => {
  const { isConnected } = useAccount();
  const { targetNetwork } = useTargetNetwork();
  const contractsData = useAllContracts();
  const writeTx = useTransactor();
  const [selectedProviderId, setSelectedProviderId] = useState<OracleProviderId>("chainlink");
  const [isSettingOracle, setIsSettingOracle] = useState(false);
  const selectedProvider = getOracleProvider(selectedProviderId);

  const providerAddress = contractsData[selectedProvider.contractName]?.address;
  const consumerContract = contractsData[ORACLE_CONSUMER_CONTRACT_NAME];
  const consumerAddress = contractsData[ORACLE_CONSUMER_CONTRACT_NAME]?.address;
  const {
    data: activeOracleAddress,
    isLoading: isActiveOracleLoading,
    refetch: refetchActiveOracle,
  } = useReadContract({
    address: consumerAddress,
    abi: consumerContract?.abi as Abi | undefined,
    chainId: targetNetwork.id,
    functionName: "oracle",
    query: {
      enabled: Boolean(consumerAddress && consumerContract?.abi),
    },
  } as any);
  const { writeContractAsync } = useWriteContract();

  const selectedProviderIsActive =
    Boolean(activeOracleAddress) &&
    Boolean(providerAddress) &&
    String(activeOracleAddress).toLowerCase() === String(providerAddress).toLowerCase();

  const activeOracleProvider = useMemo(() => {
    if (!activeOracleAddress) return undefined;

    return ORACLE_PROVIDERS.find(provider => {
      const address = contractsData[provider.contractName]?.address;

      return Boolean(address) && String(address).toLowerCase() === String(activeOracleAddress).toLowerCase();
    });
  }, [activeOracleAddress, contractsData]);

  const handleSetActiveOracle = async () => {
    if (!providerAddress || !consumerAddress || !consumerContract) return;

    try {
      setIsSettingOracle(true);
      await writeTx(
        () =>
          writeContractAsync({
            address: consumerAddress,
            abi: consumerContract.abi as Abi,
            functionName: "setOracle",
            args: [providerAddress],
          } as any),
        {
          onBlockConfirmation: () => {
            void refetchActiveOracle();
          },
        },
      );
    } finally {
      setIsSettingOracle(false);
    }
  };

  return (
    <main className="flex grow flex-col bg-base-200 px-4 py-8 md:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <div>
          <div>
            <p className="m-0 text-xs font-semibold uppercase tracking-wide text-primary">Oracle templates</p>
            <h1 className="m-0 mt-2 text-3xl font-bold md:text-4xl">Oracles</h1>
          </div>
        </div>

        <OracleProviderSelector
          consumerAddress={consumerAddress}
          isActive={selectedProviderIsActive}
          isConnected={isConnected}
          isLoadingActiveOracle={isActiveOracleLoading}
          isSettingOracle={isSettingOracle}
          onSelectProvider={setSelectedProviderId}
          onSetOracle={handleSetActiveOracle}
          providerAddress={providerAddress}
          selectedProviderId={selectedProviderId}
        />

        <OracleDeploymentStatus
          activeOracleAddress={activeOracleAddress as Address | undefined}
          activeOracleName={activeOracleProvider?.label}
          consumerAddress={consumerAddress}
          isLoadingActiveOracle={isActiveOracleLoading}
          provider={selectedProvider}
          providerAddress={providerAddress}
        />

        <OracleQuoteGrid
          consumerAddress={consumerAddress}
          isActiveProvider={selectedProviderIsActive}
          isCheckingActiveOracle={Boolean(consumerAddress && isActiveOracleLoading)}
          provider={selectedProvider}
        />
      </div>
    </main>
  );
};
