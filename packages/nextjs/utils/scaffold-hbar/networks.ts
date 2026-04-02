import * as chains from "viem/chains";
import scaffoldConfig from "~~/scaffold.config";

/** Deep import avoids the package barrel (which pulls in `wagmi`); this module only needs viem + `blo`. */
export { getBlockExplorerAddressLink } from "@scaffold-ui/hooks/dist/esm/useAddress.js";

type ChainAttributes = {
  // color | [lightThemeColor, darkThemeColor]
  color: string | [string, string];
  // Used to fetch price by providing mainnet token address
  // for networks having native currency other than ETH
  nativeCurrencyTokenAddress?: string;
};

export type ChainWithAttributes = chains.Chain & Partial<ChainAttributes>;
export type AllowedChainIds = (typeof scaffoldConfig.targetNetworks)[number]["id"];

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
 * Gives the block explorer transaction URL.
 */
export function getBlockExplorerTxLink(chainId: number, txnHash: string): string {
  const chain = Object.values(chains).find(
    c => typeof c === "object" && c !== null && "id" in c && (c as { id: number }).id === chainId,
  ) as chains.Chain | undefined;
  const baseUrl = chain?.blockExplorers?.default?.url;
  if (!baseUrl) return "";
  return `${baseUrl}/tx/${txnHash}`;
}

/**
 * @returns targetNetworks array containing networks configured in scaffold.config including extra network metadata
 */
export function getTargetNetworks(): ChainWithAttributes[] {
  return scaffoldConfig.targetNetworks.map(targetNetwork => ({
    ...targetNetwork,
    ...NETWORKS_EXTRA_DATA[targetNetwork.id],
  }));
}
