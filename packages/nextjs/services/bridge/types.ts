import type { Address, Chain } from "viem";

export type BridgeProviderId = "axelar" | "ccip" | "layerzero";

export type BridgeChainId = 296 | 11155111;

export type BridgeDirection = "hedera-to-sepolia" | "sepolia-to-hedera";

export type BridgeReadinessStatus = "misconfigured" | "not_deployed" | "wrong_network" | "ready";

export type BridgeTransactionStage =
  | "checking_config"
  | "checking_allowance"
  | "approving"
  | "quoting_fee"
  | "sending"
  | "submitted"
  | "failed";

export type BridgeNetwork = {
  id: BridgeChainId;
  label: string;
  shortLabel: string;
  chain: Chain;
};

export type BridgeProvider = {
  id: BridgeProviderId;
  label: string;
  description: string;
  trackerLabel: string;
  trackerUrl: string;
};

export type BridgeRequiredField = {
  label: string;
  value: string | number | undefined;
  kind?: "address" | "bytes32" | "number" | "string";
};

export type BridgeContractCheck = {
  label: string;
  chainId: BridgeChainId;
  address: string | undefined;
};

export type BridgeCcipRouteMetadata = {
  sourceTokenAddress: Address;
  destinationTokenAddress: Address;
  sourcePoolAddress: Address;
  destinationPoolAddress: Address;
  sourceRouterAddress: Address;
  destinationRouterAddress: Address;
  sourceChainSelector: string;
  destinationChainSelector: string;
  sourceHtsTokenAddress?: Address;
  destinationHtsTokenAddress?: Address;
};

export type BridgeRoute = {
  providerId: BridgeProviderId;
  direction: BridgeDirection;
  sourceChainId: BridgeChainId;
  destinationChainId: BridgeChainId;
  sourceTokenAddress?: Address;
  destinationTokenAddress?: Address;
  ccip?: BridgeCcipRouteMetadata;
  requiredFields: BridgeRequiredField[];
  contractChecks: BridgeContractCheck[];
};

export type BridgeReadiness = {
  status: BridgeReadinessStatus;
  reason: string;
};
