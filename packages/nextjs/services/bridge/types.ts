import type { BridgeTokenAccountStatus, BridgeTokenBalance } from "./useBridgeTokenAccount";
import type { BridgeApprovalStatus, BridgeApprovalStep } from "./useTokenApprovals";
import type { Address, Chain, Hash } from "viem";

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

export type BridgeSendStatus = "idle" | "sending" | "submitted" | "relaying" | "delivered" | "relay_failed" | "failed";

export type BridgeQuoteStatus =
  | "idle"
  | "unsupported"
  | "missing_config"
  | "invalid_amount"
  | "quoting"
  | "quoted"
  | "failed";

export type BridgeQuoteState = {
  status: BridgeQuoteStatus;
  isUpdating?: boolean;
  reason?: string;
  amountInBaseUnits?: bigint;
  tokenDecimals?: number;
  nativeFee?: bigint;
  nativeFeeLabel?: string;
};

export type BridgeApprovalsState = {
  approveNext: () => Promise<Hash | undefined>;
  isApproving: boolean;
  nextStep?: BridgeApprovalStep;
  status: BridgeApprovalStatus;
  steps: BridgeApprovalStep[];
};

export type BridgeTokenAccountState = {
  destinationToken?: BridgeTokenBalance;
  invalidate: () => Promise<unknown>;
  showHtsAssociationNotice: boolean;
  sourceToken?: BridgeTokenBalance;
  status: BridgeTokenAccountStatus;
};

export type BridgeBalanceCheck = {
  blockedLabel?: string;
  hasEnoughSourceBalance: boolean;
  reason?: string;
};

export type BridgeSubmissionState = {
  canSend: boolean;
  followUpCommand?: string;
  isSending: boolean;
  relayError?: string;
  reset: () => void;
  sendTransfer?: () => Promise<Hash | undefined>;
  status: BridgeSendStatus;
  submittedHash?: Hash;
};

export type BridgePrimaryAction =
  | {
      kind: "connect_wallet";
      label: string;
      canExecute: false;
      isPending: false;
      reason?: string;
    }
  | {
      kind: "blocked";
      label: string;
      canExecute: false;
      isPending: false;
      reason?: string;
    }
  | {
      kind: "switch_network";
      label: string;
      canExecute: true;
      isPending: boolean;
      execute: () => void | Promise<void>;
    }
  | {
      kind: "approve";
      label: string;
      canExecute: true;
      isPending: boolean;
      execute: () => void | Promise<void>;
    }
  | {
      kind: "send";
      label: string;
      canExecute: true;
      isPending: boolean;
      execute: () => void | Promise<void>;
    };

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

export type BridgeConfigIssue = {
  field: BridgeRequiredField;
  issue: string;
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

export type BridgeAxelarRouteMetadata = {
  tokenId: `0x${string}`;
  interchainTokenServiceAddress: Address;
  sourceTokenAddress: Address;
  destinationTokenAddress: Address;
  destinationAxelarName: string;
  gasValue: string;
  nativeFee: string;
  gasLimit?: string;
};

export type BridgeLayerZeroRouteMetadata = {
  sourceOftAddress: Address;
  destinationOftAddress: Address;
  sourceTokenAddress: Address;
  destinationTokenAddress: Address;
  sourceEndpointAddress: Address;
  destinationEndpointAddress: Address;
  destinationReceiveUlnAddress: Address;
  destinationWorkersDvnAddress: Address;
  destinationWorkersExecutorAddress: Address;
  sourceEid: number;
  destinationEid: number;
  receiveGas: string;
  relayReceiveGas?: string;
  minAmountBps: string;
  relayCommand: string;
  sourceGasLimit?: string;
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
  axelar?: BridgeAxelarRouteMetadata;
  ccip?: BridgeCcipRouteMetadata;
  layerzero?: BridgeLayerZeroRouteMetadata;
  requiredFields: BridgeRequiredField[];
  contractChecks: BridgeContractCheck[];
};

export type BridgeReadiness = {
  status: BridgeReadinessStatus;
  reason: string;
};

export type BridgeProviderStrategy = {
  providerId: BridgeProviderId;
  quote: BridgeQuoteState;
  approvals: BridgeApprovalsState;
  tokenAccount: BridgeTokenAccountState;
  submission: BridgeSubmissionState;
  resetSubmission: () => void;
};

export type BridgeFlow = {
  route: BridgeRoute;
  provider: BridgeProvider;
  sourceNetwork: BridgeNetwork;
  destinationNetwork: BridgeNetwork;
  readiness: BridgeReadiness;
  isChecking: boolean;
  isQuoteSettling: boolean;
  configIssues: BridgeConfigIssue[];
  showConfigWarning: boolean;
  balanceCheck: BridgeBalanceCheck;
  quote: BridgeQuoteState;
  approvals: BridgeApprovalsState;
  tokenAccount: BridgeTokenAccountState;
  submission: BridgeSubmissionState;
  primaryAction: BridgePrimaryAction;
  resetSubmission: () => void;
};
