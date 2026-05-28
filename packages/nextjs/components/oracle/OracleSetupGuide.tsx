import type { Address as ViemAddress } from "viem";
import { ArrowPathIcon, CheckCircleIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import type { OracleProvider } from "~~/services/oracle";

type OracleSetupGuideProps = {
  consumerAddress?: ViemAddress;
  isActiveProvider: boolean;
  isConnected: boolean;
  isLoadingActiveOracle: boolean;
  provider: OracleProvider;
  providerAddress?: ViemAddress;
};

type OracleSetupGuideState = {
  icon: "info" | "loading" | "success";
  message: string;
  title: string;
};

const getSetupGuideState = ({
  consumerAddress,
  isActiveProvider,
  isConnected,
  isLoadingActiveOracle,
  provider,
  providerAddress,
}: OracleSetupGuideProps): OracleSetupGuideState => {
  if (!isConnected) {
    return {
      icon: "info",
      title: "Next step",
      message: "Connect your wallet to activate an oracle after deployment.",
    };
  }

  if (!providerAddress) {
    return {
      icon: "info",
      title: `${provider.label} adapter not deployed`,
      message: `${provider.label} is selected, but ${provider.contractName} is not deployed yet. Use the command in the Oracle contract card above to deploy it.`,
    };
  }

  if (!consumerAddress) {
    return {
      icon: "info",
      title: "OracleConsumer not deployed",
      message:
        "The adapter is ready, but OracleConsumer is not deployed yet. Use the command in the Consumer card above so the app can read normalized prices.",
    };
  }

  if (isLoadingActiveOracle) {
    return {
      icon: "loading",
      title: "Checking setup",
      message: "Checking which oracle OracleConsumer is using.",
    };
  }

  if (!isActiveProvider) {
    return {
      icon: "info",
      title: `${provider.label} is not active`,
      message: `${provider.label} is deployed, but OracleConsumer is still using another oracle. Set ${provider.label} as active using the action button above.`,
    };
  }

  return {
    icon: "success",
    title: "Configuration ready",
    message: "Configuration ready. Prices below are being read through OracleConsumer.",
  };
};

export const OracleSetupGuide = (props: OracleSetupGuideProps) => {
  const guide = getSetupGuideState(props);
  const alertClassName = guide.icon === "success" ? "alert alert-success alert-soft" : "alert alert-info alert-soft";
  const iconClassName = "h-6 w-6 shrink-0";

  return (
    <section aria-label="Oracle setup guidance">
      <div role="status" className={`${alertClassName} items-start rounded-lg border border-base-300 shadow-md`}>
        {guide.icon === "success" ? (
          <CheckCircleIcon className={iconClassName} />
        ) : guide.icon === "loading" ? (
          <ArrowPathIcon className={`${iconClassName} animate-spin`} />
        ) : (
          <InformationCircleIcon className={iconClassName} />
        )}
        <div>
          <p className="m-0 text-xs font-semibold uppercase tracking-wide">{guide.title}</p>
          <p className="m-0 mt-1 text-sm leading-6">{guide.message}</p>
        </div>
      </div>
    </section>
  );
};
