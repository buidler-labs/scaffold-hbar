import * as chains from "viem/chains";
import scaffoldConfig from "~~/scaffold.config";

type ChainAttributes = {
  // color | [lightThemeColor, darkThemeColor]
  color: string | [string, string];
  // Used to fetch price by providing mainnet token address
  // for networks having native currency other than ETH
  nativeCurrencyTokenAddress?: string;
};

export type ChainWithAttributes = chains.Chain & Partial<ChainAttributes>;
export type AllowedChainIds = (typeof scaffoldConfig.targetNetworks)[number]["id"];

// Local fork (31337) is Hedera-shaped; account ID resolution uses optional local mirror
const HEDERA_CHAIN_IDS: Set<number> = new Set([chains.hedera.id, chains.hederaTestnet.id, 31337]);

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
 * Gives the block explorer URL for a given address.
 * HashScan uses /account/ instead of /address/ for Hedera chains.
 */
export function getBlockExplorerAddressLink(network: chains.Chain, address: string) {
  const blockExplorerBaseURL = network.blockExplorers?.default?.url;

  if (!blockExplorerBaseURL) {
    return `https://hashscan.io/testnet/account/${address}`;
  }

  const pathSegment = HEDERA_CHAIN_IDS.has(network.id) ? "account" : "address";
  return `${blockExplorerBaseURL}/${pathSegment}/${address}`;
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
