"use client";

import { useMemo, useState } from "react";
import type { Address } from "viem";
import { useAccount } from "wagmi";
import { OracleDeploymentStatus } from "~~/components/oracle/OracleDeploymentStatus";
import { OracleProviderSelector } from "~~/components/oracle/OracleProviderSelector";
import { OracleQuoteGrid } from "~~/components/oracle/OracleQuoteGrid";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-hbar";
import {
  ORACLE_CONSUMER_CONTRACT_NAME,
  ORACLE_PROVIDERS,
  type OracleProviderId,
  getOracleProvider,
} from "~~/services/oracle";
import type { ContractName } from "~~/utils/scaffold-hbar/contract";
import { useAllContracts } from "~~/utils/scaffold-hbar/contractsData";

const ORACLE_CONSUMER_CONTRACT = ORACLE_CONSUMER_CONTRACT_NAME as ContractName;

export const OracleDashboard = () => {
  const { isConnected } = useAccount();
  const contractsData = useAllContracts();
  const [selectedProviderId, setSelectedProviderId] = useState<OracleProviderId>("chainlink");
  const selectedProvider = getOracleProvider(selectedProviderId);

  const providerAddress = contractsData[selectedProvider.contractName]?.address;
  const consumerAddress = contractsData[ORACLE_CONSUMER_CONTRACT_NAME]?.address;
  const {
    data: activeOracleAddress,
    isLoading: isActiveOracleLoading,
    refetch: refetchActiveOracle,
  } = useScaffoldReadContract({
    contractName: ORACLE_CONSUMER_CONTRACT,
    functionName: "oracle",
    watch: true,
    query: {
      enabled: Boolean(consumerAddress),
    },
  });
  const { writeContractAsync, isMining: isSettingOracle } = useScaffoldWriteContract({
    contractName: ORACLE_CONSUMER_CONTRACT,
  });

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
    if (!providerAddress) return;

    await writeContractAsync(
      {
        functionName: "setOracle",
        args: [providerAddress],
      },
      {
        onBlockConfirmation: () => {
          void refetchActiveOracle();
        },
      },
    );
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
