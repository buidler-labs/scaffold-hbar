"use client";

import { CheckIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import {
  BRIDGE_PROVIDERS,
  type BridgeDirection,
  type BridgeProviderId,
  getBridgeProvider,
  getBridgeRoute,
  getRouteConfigIssue,
} from "~~/services/bridge";

type BridgeProviderSelectorProps = {
  direction: BridgeDirection;
  selectedProviderId: BridgeProviderId;
  onSelectProvider: (providerId: BridgeProviderId) => void;
};

export const BridgeProviderSelector = ({
  direction,
  selectedProviderId,
  onSelectProvider,
}: BridgeProviderSelectorProps) => {
  const selectedProvider = getBridgeProvider(selectedProviderId);
  const selectedRoute = getBridgeRoute(selectedProviderId, direction);
  const selectedIssue = getRouteConfigIssue(selectedRoute);

  return (
    <div className="block">
      <div className="mb-2 flex items-center justify-between gap-3">
        <label id="bridge-provider-label" className="text-sm font-semibold">
          Provider
        </label>
        <span className={`badge badge-sm ${selectedIssue ? "badge-warning" : "badge-success"}`}>
          {selectedIssue ? "Config needed" : "Configured"}
        </span>
      </div>

      <details className="dropdown w-full">
        <summary
          aria-labelledby="bridge-provider-label"
          className="btn flex min-h-12 w-full justify-between rounded-lg border border-base-300 bg-base-200 px-4 text-left text-base font-semibold shadow-sm hover:border-primary hover:bg-base-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span>{selectedProvider.label}</span>
          <ChevronDownIcon className="h-4 w-4" />
        </summary>
        <ul className="menu dropdown-content z-20 mt-2 w-full rounded-lg border border-base-300 bg-base-100 p-2 shadow-xl">
          {BRIDGE_PROVIDERS.map(provider => {
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
                  {isSelected ? <CheckIcon className="h-4 w-4" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </details>

      <p className="m-0 mt-2 text-xs leading-5 text-base-content/60">{selectedProvider.description}</p>
    </div>
  );
};
