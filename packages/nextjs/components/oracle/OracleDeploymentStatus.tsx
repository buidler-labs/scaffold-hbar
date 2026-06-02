import type { Address as ViemAddress } from "viem";
import { OracleDeploymentItem } from "~~/components/oracle/OracleDeploymentItem";
import { useDeployedContractOwner } from "~~/hooks/scaffold-hbar";
import { ORACLE_CONSUMER_CONTRACT_NAME, type OracleProvider, getOracleConsumerDeployCommand } from "~~/services/oracle";

type OracleDeploymentStatusProps = {
  activeOracleAddress?: ViemAddress;
  activeOracleName?: string;
  consumerAddress?: ViemAddress;
  isLoadingActiveOracle: boolean;
  provider: OracleProvider;
  providerAddress?: ViemAddress;
};

export const OracleDeploymentStatus = ({
  activeOracleAddress,
  activeOracleName,
  consumerAddress,
  isLoadingActiveOracle,
  provider,
  providerAddress,
}: OracleDeploymentStatusProps) => {
  const consumerOwner = useDeployedContractOwner({
    address: consumerAddress,
    contractName: ORACLE_CONSUMER_CONTRACT_NAME,
  });
  const activeOracleLabel = consumerAddress
    ? isLoadingActiveOracle
      ? "Checking active oracle"
      : (activeOracleName ?? (activeOracleAddress ? "Unknown oracle" : "No active oracle"))
    : "Consumer not deployed";
  const activeOracleBadgeLabel = isLoadingActiveOracle
    ? "Checking"
    : activeOracleName
      ? "Active"
      : activeOracleAddress
        ? "Unknown"
        : "Not set";
  const activeOracleBadgeClassName = isLoadingActiveOracle
    ? "badge-info"
    : activeOracleName
      ? "badge-success"
      : activeOracleAddress
        ? "badge-warning"
        : "badge-outline";

  return (
    <section className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-md">
      <div>
        <p className="m-0 text-xs font-semibold uppercase tracking-wide text-base-content/50">Deployments</p>
        <h2 className="m-0 mt-1 text-xl font-bold">Testnet contracts</h2>
      </div>

      <div className="mt-5 grid gap-3 xl:grid-cols-3">
        <OracleDeploymentItem
          address={providerAddress}
          command={provider.deployCommand}
          eyebrow="Oracle contract"
          hideOwner
          statusClassName={providerAddress ? "badge-success" : "badge-warning"}
          statusLabel={providerAddress ? "Ready" : "Not deployed"}
          title={provider.contractName}
        />
        <OracleDeploymentItem
          address={consumerAddress}
          command={getOracleConsumerDeployCommand(provider.contractName)}
          eyebrow="Consumer"
          isOwnerLoading={consumerOwner.isLoading}
          owner={consumerOwner.owner}
          statusClassName={consumerAddress ? "badge-success" : "badge-warning"}
          statusLabel={consumerAddress ? "Ready" : "Not deployed"}
          supportsOwner={consumerOwner.supportsOwner}
          title={ORACLE_CONSUMER_CONTRACT_NAME}
        />
        <OracleDeploymentItem
          address={consumerAddress ? activeOracleAddress : undefined}
          emptyText={consumerAddress ? "No active oracle loaded yet" : "Deploy OracleConsumer first"}
          eyebrow="Active oracle"
          hideOwner
          statusClassName={activeOracleBadgeClassName}
          statusLabel={activeOracleBadgeLabel}
          title={activeOracleLabel}
        />
      </div>
    </section>
  );
};
