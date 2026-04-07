import * as chains from "viem/chains";
import scaffoldConfig from "~~/scaffold.config";

export { getBlockExplorerAddressLink, getBlockExplorerTxLink } from "@scaffold-hbar-ui/hooks";

type ChainAttributes = {
  // color | [lightThemeColor, darkThemeColor]
  color: string | [string, string];
  // Used to fetch price by providing mainnet token address
  // for networks having native currency other than ETH
  nativeCurrencyTokenAddress?: string;
};

export type ChainWithAttributes = chains.Chain & Partial<ChainAttributes>;
export type AllowedChainIds = (typeof scaffoldConfig.targetNetworks)[number]["id"];
export type HederaNetworkName = "testnet" | "mainnet";

export const NETWORKS_EXTRA_DATA: Record<string, ChainAttributes> = {
  [chains.mainnet.id]: {
    color: "#ff8b9e",
  },
  [chains.hedera.id]: {
    color: "#8259EF",
  },
  [chains.hederaTestnet.id]: {
    color: ["#8259EF", "#A98AFF"],
  },
  31337: {
    color: ["#6B7280", "#9CA3AF"],
  },
};

/**
 * @returns targetNetworks array containing networks configured in scaffold.config including extra network metadata
 */
export function getTargetNetworks(): ChainWithAttributes[] {
  return scaffoldConfig.targetNetworks.map(targetNetwork => ({
    ...targetNetwork,
    ...NETWORKS_EXTRA_DATA[targetNetwork.id],
  }));
}

export function getHederaNetworkNameFromChainId(chainId: number): HederaNetworkName {
  if (chainId === chains.hedera.id) return "mainnet";
  if (chainId === chains.hederaTestnet.id) return "testnet";
  return "testnet";
}
