import type { BridgeChainId, BridgeDirection, BridgeNetwork, BridgeProvider } from "./types";
import { hederaTestnet, sepolia } from "viem/chains";

export const HEDERA_TESTNET_CHAIN_ID = 296;
export const SEPOLIA_CHAIN_ID = 11155111;

export const BRIDGE_NETWORKS = {
  [HEDERA_TESTNET_CHAIN_ID]: {
    id: HEDERA_TESTNET_CHAIN_ID,
    label: "Hedera Testnet",
    shortLabel: "Hedera",
    chain: hederaTestnet,
  },
  [SEPOLIA_CHAIN_ID]: {
    id: SEPOLIA_CHAIN_ID,
    label: "Ethereum Sepolia",
    shortLabel: "Sepolia",
    chain: sepolia,
  },
} as const satisfies Record<BridgeChainId, BridgeNetwork>;

export const BRIDGE_DIRECTIONS: Record<
  BridgeDirection,
  { label: string; sourceChainId: BridgeChainId; destinationChainId: BridgeChainId }
> = {
  "hedera-to-sepolia": {
    label: "Hedera to Sepolia",
    sourceChainId: HEDERA_TESTNET_CHAIN_ID,
    destinationChainId: SEPOLIA_CHAIN_ID,
  },
  "sepolia-to-hedera": {
    label: "Sepolia to Hedera",
    sourceChainId: SEPOLIA_CHAIN_ID,
    destinationChainId: HEDERA_TESTNET_CHAIN_ID,
  },
};

export const BRIDGE_PROVIDERS = [
  {
    id: "axelar",
    label: "Axelar",
    description: "ITS transfer using the deployed bridge token pair.",
    trackerLabel: "AxelarScan",
    trackerUrl: "https://testnet.axelarscan.io",
  },
  {
    id: "ccip",
    label: "CCIP",
    description: "Chainlink CCT burn-and-mint route.",
    trackerLabel: "CCIP Explorer",
    trackerUrl: "https://ccip.chain.link",
  },
  {
    id: "layerzero",
    label: "LayerZero",
    description: "OFT send with an automatic mock relay for this template.",
    trackerLabel: "LayerZero Scan",
    trackerUrl: "https://testnet.layerzeroscan.com",
  },
] as const satisfies readonly BridgeProvider[];
