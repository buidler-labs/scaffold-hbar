"use client";

import { wagmiConnectors } from "./wagmiConnectors";
import { createClient, fallback, http } from "viem";
import { Config, createConfig } from "wagmi";
import scaffoldConfig, { ScaffoldConfig } from "~~/scaffold.config";

const { targetNetworks } = scaffoldConfig;

export const enabledChains = targetNetworks;

let wagmiConfig: Config | undefined;

export const getWagmiConfig = (): Config => {
  if (wagmiConfig) {
    return wagmiConfig;
  }

  wagmiConfig = createConfig({
    chains: enabledChains,
    connectors: wagmiConnectors(),
    ssr: true,
    client({ chain }) {
      const rpcFallbacks = [];

      const rpcOverrideUrl = (scaffoldConfig.rpcOverrides as ScaffoldConfig["rpcOverrides"])?.[chain.id];
      if (rpcOverrideUrl) {
        rpcFallbacks.push(http(rpcOverrideUrl));
      }

      // Default public RPC for the chain (e.g. Hedera testnet hashio)
      rpcFallbacks.push(http());

      return createClient({
        chain,
        transport: fallback(rpcFallbacks),
        pollingInterval: scaffoldConfig.pollingInterval,
      });
    },
  });

  return wagmiConfig;
};
