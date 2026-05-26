import type { Address as ViemAddress } from "viem";
import { CheckCircleIcon, ChevronDownIcon, CircleStackIcon } from "@heroicons/react/24/outline";
import { ORACLE_PROVIDERS, type OracleProviderId, getOracleProvider } from "~~/services/oracle";

type OracleProviderSelectorProps = {
  consumerAddress?: ViemAddress;
  isActive: boolean;
  isConnected: boolean;
  isLoadingActiveOracle: boolean;
  isSettingOracle: boolean;
  onSetOracle: () => void;
  providerAddress?: ViemAddress;
  selectedProviderId: OracleProviderId;
  onSelectProvider: (providerId: OracleProviderId) => void;
};

export const OracleProviderSelector = ({
  consumerAddress,
  isActive,
  isConnected,
  isLoadingActiveOracle,
  isSettingOracle,
  onSelectProvider,
  onSetOracle,
  providerAddress,
  selectedProviderId,
}: OracleProviderSelectorProps) => {
  const selectedProvider = getOracleProvider(selectedProviderId);
  const isReadyToSet = Boolean(
    isConnected && consumerAddress && providerAddress && !isActive && !isLoadingActiveOracle,
  );
  const buttonLabel = !isConnected
    ? "Connect wallet"
    : !consumerAddress || !providerAddress
      ? "Deploy contracts first"
      : isLoadingActiveOracle
        ? "Checking active oracle"
        : isActive
          ? `${selectedProvider.label} is active`
          : `Set ${selectedProvider.label} as active oracle`;

  return (
    <section className="rounded-lg border border-base-300 bg-base-100 p-4 shadow-md">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <p className="m-0 text-xs font-semibold uppercase tracking-wide text-base-content/50">Oracle</p>
              <h2 className="m-0 mt-1 text-xl font-bold">{selectedProvider.label}</h2>
            </div>
            <CircleStackIcon className="h-6 w-6 text-primary lg:hidden" />
          </div>

          <details className="dropdown w-full">
            <summary className="btn flex min-h-12 w-full justify-between rounded-lg border border-base-300 bg-base-200 px-4 text-left text-base font-semibold shadow-sm hover:border-primary hover:bg-base-200">
              <span>{selectedProvider.label}</span>
              <ChevronDownIcon className="h-4 w-4" />
            </summary>
            <ul className="menu dropdown-content z-20 mt-2 w-full rounded-lg border border-base-300 bg-base-100 p-2 shadow-xl">
              {ORACLE_PROVIDERS.map(provider => {
                const isSelected = provider.id === selectedProviderId;

                return (
                  <li key={provider.id}>
                    <button
                      type="button"
                      className={`flex justify-between rounded-md font-semibold ${
                        isSelected ? "bg-primary text-primary-content" : "hover:bg-base-200"
                      }`}
                      onClick={event => {
                        onSelectProvider(provider.id);
                        event.currentTarget.closest("details")?.removeAttribute("open");
                      }}
                    >
                      <span>{provider.label}</span>
                      {isSelected ? <CheckCircleIcon className="h-4 w-4" /> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </details>
        </div>

        <button
          type="button"
          className="btn btn-primary w-full lg:min-w-64"
          disabled={!isReadyToSet || isSettingOracle}
          onClick={onSetOracle}
        >
          {isSettingOracle ? <span className="loading loading-spinner loading-sm" /> : null}
          {buttonLabel}
        </button>
      </div>
    </section>
  );
};
