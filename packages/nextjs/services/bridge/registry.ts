import axelarConfig from "./config/axelar.json";
import ccipConfig from "./config/ccip.json";
import layerzeroConfig from "./config/layerzero.json";
import { BRIDGE_DIRECTIONS, BRIDGE_PROVIDERS, HEDERA_TESTNET_CHAIN_ID, SEPOLIA_CHAIN_ID } from "./constants";
import { LAYERZERO_DEFAULT_MIN_AMOUNT_BPS, LAYERZERO_DEFAULT_RECEIVE_GAS } from "./layerzeroMessage";
import type {
  BridgeAxelarRouteMetadata,
  BridgeCcipRouteMetadata,
  BridgeChainId,
  BridgeContractCheck,
  BridgeDirection,
  BridgeLayerZeroRouteMetadata,
  BridgeProviderId,
  BridgeRequiredField,
  BridgeRoute,
} from "./types";
import {
  type AxelarChainConfig,
  type AxelarRouteConfig,
  type CcipChainConfig,
  type LayerZeroChainConfig,
  type LayerZeroRouteConfig,
  axelarChainConfigSchema,
  axelarRouteConfigSchema,
  bridgeField,
  ccipChainConfigSchema,
  getFieldIssue,
  layerZeroChainConfigSchema,
  layerZeroRouteConfigSchema,
} from "./validation";
import type { Address } from "viem";
import { isAddress } from "viem";

const getConfigForChain = <TConfig extends { chains: Record<string, unknown> }>(
  config: TConfig,
  chainId: BridgeChainId,
) => config.chains[String(chainId)] as Record<string, string | number | undefined>;

const check = (label: string, chainId: BridgeChainId, address: string | undefined): BridgeContractCheck => ({
  label,
  chainId,
  address,
});

const asAddress = (value: string | undefined) => (isAddress(value || "") ? (value as Address) : undefined);

const getCcipConfigForChain = (chainId: BridgeChainId) =>
  ccipChainConfigSchema.safeParse(getConfigForChain(ccipConfig, chainId));

const getAxelarConfigForChain = (chainId: BridgeChainId) =>
  axelarChainConfigSchema.safeParse(getConfigForChain(axelarConfig, chainId));

const getAxelarRouteConfig = () => axelarRouteConfigSchema.safeParse(axelarConfig);

const getLayerZeroConfigForChain = (chainId: BridgeChainId) =>
  layerZeroChainConfigSchema.safeParse(getConfigForChain(layerzeroConfig, chainId));

const getLayerZeroRouteConfig = () => layerZeroRouteConfigSchema.safeParse(layerzeroConfig);

const directionChainIds = (direction: BridgeDirection) => {
  const directionConfig = BRIDGE_DIRECTIONS[direction];
  return {
    sourceChainId: directionConfig.sourceChainId,
    destinationChainId: directionConfig.destinationChainId,
  };
};

const buildAxelarMetadata = (
  routeConfig: AxelarRouteConfig,
  source: AxelarChainConfig,
  destination: AxelarChainConfig,
): BridgeAxelarRouteMetadata => ({
  tokenId: routeConfig.tokenId as `0x${string}`,
  interchainTokenServiceAddress: routeConfig.interchainTokenService as Address,
  sourceTokenAddress: source.bridgeToken as Address,
  destinationTokenAddress: destination.bridgeToken as Address,
  destinationAxelarName: destination.axelarName,
  gasValue: source.gasValue ?? routeConfig.gasValue,
  nativeFee: source.nativeFee ?? routeConfig.nativeFee,
  gasLimit: source.gasLimit,
});

const buildAxelarRoute = (direction: BridgeDirection): BridgeRoute => {
  const { sourceChainId, destinationChainId } = directionChainIds(direction);
  const rawSource = getConfigForChain(axelarConfig, sourceChainId);
  const rawDestination = getConfigForChain(axelarConfig, destinationChainId);
  const source = getAxelarConfigForChain(sourceChainId);
  const destination = getAxelarConfigForChain(destinationChainId);
  const routeConfig = getAxelarRouteConfig();
  const sourceToken = rawSource.bridgeToken as string | undefined;
  const destinationToken = rawDestination.bridgeToken as string | undefined;

  return {
    providerId: "axelar",
    direction,
    sourceChainId,
    destinationChainId,
    sourceTokenAddress: asAddress(sourceToken),
    destinationTokenAddress: asAddress(destinationToken),
    axelar:
      routeConfig.success && source.success && destination.success
        ? buildAxelarMetadata(routeConfig.data, source.data, destination.data)
        : undefined,
    requiredFields: [
      bridgeField.bytes32("Axelar token id", axelarConfig.tokenId),
      bridgeField.address("Axelar ITS address", axelarConfig.interchainTokenService),
      bridgeField.address("Axelar source bridge token", sourceToken),
      bridgeField.address("Axelar destination bridge token", destinationToken),
      bridgeField.string("Axelar destination chain name", rawDestination.axelarName as string | undefined),
      bridgeField.number("Axelar source gas value", rawSource.gasValue ?? axelarConfig.gasValue),
      bridgeField.number("Axelar source native fee", rawSource.nativeFee ?? axelarConfig.nativeFee),
    ],
    contractChecks: [
      check("Axelar ITS", sourceChainId, axelarConfig.interchainTokenService),
      check("Source bridge token", sourceChainId, sourceToken),
      check("Destination bridge token", destinationChainId, destinationToken),
    ],
  };
};

const getCcipRequiredFields = (
  source: Record<string, string | number | undefined>,
  destination: Record<string, string | number | undefined>,
  sourceChainId: BridgeChainId,
) => {
  const fields = [
    bridgeField.address("CCIP source token", source.token as string | undefined),
    bridgeField.address("CCIP source pool", source.pool as string | undefined),
    bridgeField.address("CCIP source router", source.router as string | undefined),
    bridgeField.number("CCIP source chain selector", source.chainSelector),
    bridgeField.number("CCIP remote chain selector", source.remoteChainSelector),
    bridgeField.address("CCIP destination token", destination.token as string | undefined),
    bridgeField.address("CCIP destination pool", destination.pool as string | undefined),
    bridgeField.address("CCIP destination router", destination.router as string | undefined),
  ];

  if (sourceChainId === HEDERA_TESTNET_CHAIN_ID) {
    fields.push(bridgeField.address("CCIP Hedera HTS token", source.htsToken as string | undefined));
  }

  return fields;
};

const buildCcipMetadata = (source: CcipChainConfig, destination: CcipChainConfig): BridgeCcipRouteMetadata => ({
  sourceTokenAddress: source.token as Address,
  destinationTokenAddress: destination.token as Address,
  sourcePoolAddress: source.pool as Address,
  destinationPoolAddress: destination.pool as Address,
  sourceRouterAddress: source.router as Address,
  destinationRouterAddress: destination.router as Address,
  sourceChainSelector: source.chainSelector,
  destinationChainSelector: source.remoteChainSelector,
  sourceHtsTokenAddress: source.htsToken as Address | undefined,
  destinationHtsTokenAddress: destination.htsToken as Address | undefined,
});

const getCcipContractChecks = (
  source: Record<string, string | number | undefined>,
  destination: Record<string, string | number | undefined>,
  sourceChainId: BridgeChainId,
  destinationChainId: BridgeChainId,
): BridgeContractCheck[] => [
  check("Source token", sourceChainId, source.token as string | undefined),
  check("Source pool", sourceChainId, source.pool as string | undefined),
  check("Source router", sourceChainId, source.router as string | undefined),
  ...(sourceChainId === HEDERA_TESTNET_CHAIN_ID
    ? [check("Hedera HTS token", sourceChainId, source.htsToken as string | undefined)]
    : []),
  check("Destination token", destinationChainId, destination.token as string | undefined),
  check("Destination pool", destinationChainId, destination.pool as string | undefined),
  check("Destination router", destinationChainId, destination.router as string | undefined),
];

const buildCcipRoute = (direction: BridgeDirection): BridgeRoute => {
  const { sourceChainId, destinationChainId } = directionChainIds(direction);
  const rawSource = getConfigForChain(ccipConfig, sourceChainId);
  const rawDestination = getConfigForChain(ccipConfig, destinationChainId);
  const source = getCcipConfigForChain(sourceChainId);
  const destination = getCcipConfigForChain(destinationChainId);
  const sourceToken = rawSource.token as string | undefined;
  const destinationToken = rawDestination.token as string | undefined;

  return {
    providerId: "ccip",
    direction,
    sourceChainId,
    destinationChainId,
    sourceTokenAddress: asAddress(sourceToken),
    destinationTokenAddress: asAddress(destinationToken),
    ccip: source.success && destination.success ? buildCcipMetadata(source.data, destination.data) : undefined,
    requiredFields: getCcipRequiredFields(rawSource, rawDestination, sourceChainId),
    contractChecks: getCcipContractChecks(rawSource, rawDestination, sourceChainId, destinationChainId),
  };
};

const getLayerZeroTokenAddress = (
  chainId: BridgeChainId,
  chainConfig: Pick<LayerZeroChainConfig, "htsToken" | "oft">,
) => (chainId === HEDERA_TESTNET_CHAIN_ID ? chainConfig.htsToken : chainConfig.oft);

const buildLayerZeroMetadata = ({
  destination,
  destinationChainId,
  routeConfig,
  source,
  sourceChainId,
}: {
  destination: LayerZeroChainConfig;
  destinationChainId: BridgeChainId;
  routeConfig: LayerZeroRouteConfig;
  source: LayerZeroChainConfig;
  sourceChainId: BridgeChainId;
}): BridgeLayerZeroRouteMetadata | undefined => {
  const sourceTokenAddress = getLayerZeroTokenAddress(sourceChainId, source);
  const destinationTokenAddress = getLayerZeroTokenAddress(destinationChainId, destination);

  if (!sourceTokenAddress || !destinationTokenAddress) return undefined;

  return {
    sourceOftAddress: source.oft as Address,
    destinationOftAddress: destination.oft as Address,
    sourceTokenAddress: sourceTokenAddress as Address,
    destinationTokenAddress: destinationTokenAddress as Address,
    sourceEndpointAddress: source.endpointV2 as Address,
    destinationEndpointAddress: destination.endpointV2 as Address,
    destinationReceiveUlnAddress: destination.receiveUln302 as Address,
    destinationWorkersDvnAddress: destination.workersDvn as Address,
    destinationWorkersExecutorAddress: destination.workersExecutor as Address,
    sourceEid: source.eid,
    destinationEid: source.remoteEid,
    receiveGas: routeConfig.receiveGas ?? LAYERZERO_DEFAULT_RECEIVE_GAS,
    relayReceiveGas: destination.relayReceiveGas,
    minAmountBps: routeConfig.minAmountBps ?? LAYERZERO_DEFAULT_MIN_AMOUNT_BPS,
    relayCommand: routeConfig.relayCommand,
    sourceGasLimit: source.gasLimit,
    sourceHtsTokenAddress: source.htsToken as Address | undefined,
    destinationHtsTokenAddress: destination.htsToken as Address | undefined,
  };
};

const getLayerZeroRequiredFields = (
  source: Record<string, string | number | undefined>,
  destination: Record<string, string | number | undefined>,
  sourceChainId: BridgeChainId,
  destinationChainId: BridgeChainId,
) => {
  const fields = [
    bridgeField.address("LayerZero source OFT", source.oft as string | undefined),
    bridgeField.address("LayerZero source endpoint", source.endpointV2 as string | undefined),
    bridgeField.number("LayerZero source EID", source.eid),
    bridgeField.number("LayerZero remote EID", source.remoteEid),
    bridgeField.address("LayerZero destination OFT", destination.oft as string | undefined),
    bridgeField.address("LayerZero destination endpoint", destination.endpointV2 as string | undefined),
    bridgeField.address("LayerZero destination receive ULN", destination.receiveUln302 as string | undefined),
    bridgeField.address("LayerZero destination workers DVN", destination.workersDvn as string | undefined),
    bridgeField.address("LayerZero destination workers executor", destination.workersExecutor as string | undefined),
    bridgeField.string("LayerZero relay command", layerzeroConfig.relayCommand),
    bridgeField.number("LayerZero receive gas", layerzeroConfig.receiveGas ?? LAYERZERO_DEFAULT_RECEIVE_GAS),
    bridgeField.number("LayerZero relay receive gas", destination.relayReceiveGas ?? "500000"),
    bridgeField.number("LayerZero min amount bps", layerzeroConfig.minAmountBps ?? LAYERZERO_DEFAULT_MIN_AMOUNT_BPS),
  ];

  if (sourceChainId === HEDERA_TESTNET_CHAIN_ID) {
    fields.push(bridgeField.address("LayerZero source HTS token", source.htsToken as string | undefined));
    fields.push(bridgeField.number("LayerZero source gas limit", source.gasLimit));
  }

  if (destinationChainId === HEDERA_TESTNET_CHAIN_ID) {
    fields.push(bridgeField.address("LayerZero destination HTS token", destination.htsToken as string | undefined));
  }

  return fields;
};

const getLayerZeroContractChecks = (
  source: Record<string, string | number | undefined>,
  destination: Record<string, string | number | undefined>,
  sourceChainId: BridgeChainId,
  destinationChainId: BridgeChainId,
): BridgeContractCheck[] => [
  check("Source OFT", sourceChainId, source.oft as string | undefined),
  check("Source endpoint", sourceChainId, source.endpointV2 as string | undefined),
  ...(sourceChainId === HEDERA_TESTNET_CHAIN_ID
    ? [check("Source HTS token", sourceChainId, source.htsToken as string | undefined)]
    : []),
  check("Destination OFT", destinationChainId, destination.oft as string | undefined),
  check("Destination endpoint", destinationChainId, destination.endpointV2 as string | undefined),
  check("Destination receive ULN", destinationChainId, destination.receiveUln302 as string | undefined),
  check("Destination workers DVN", destinationChainId, destination.workersDvn as string | undefined),
  check("Destination workers executor", destinationChainId, destination.workersExecutor as string | undefined),
  ...(destinationChainId === HEDERA_TESTNET_CHAIN_ID
    ? [check("Destination HTS token", destinationChainId, destination.htsToken as string | undefined)]
    : []),
];

const buildLayerzeroRoute = (direction: BridgeDirection): BridgeRoute => {
  const { sourceChainId, destinationChainId } = directionChainIds(direction);
  const rawSource = getConfigForChain(layerzeroConfig, sourceChainId);
  const rawDestination = getConfigForChain(layerzeroConfig, destinationChainId);
  const source = getLayerZeroConfigForChain(sourceChainId);
  const destination = getLayerZeroConfigForChain(destinationChainId);
  const routeConfig = getLayerZeroRouteConfig();
  const sourceOft = rawSource.oft as string | undefined;
  const destinationOft = rawDestination.oft as string | undefined;
  const sourceToken = source.success ? getLayerZeroTokenAddress(sourceChainId, source.data) : sourceOft;
  const destinationToken = destination.success
    ? getLayerZeroTokenAddress(destinationChainId, destination.data)
    : destinationOft;

  return {
    providerId: "layerzero",
    direction,
    sourceChainId,
    destinationChainId,
    sourceTokenAddress: asAddress(sourceToken),
    destinationTokenAddress: asAddress(destinationToken),
    layerzero:
      routeConfig.success && source.success && destination.success
        ? buildLayerZeroMetadata({
            destination: destination.data,
            destinationChainId,
            routeConfig: routeConfig.data,
            source: source.data,
            sourceChainId,
          })
        : undefined,
    requiredFields: getLayerZeroRequiredFields(rawSource, rawDestination, sourceChainId, destinationChainId),
    contractChecks: getLayerZeroContractChecks(rawSource, rawDestination, sourceChainId, destinationChainId),
  };
};

export const getBridgeRoute = (providerId: BridgeProviderId, direction: BridgeDirection): BridgeRoute => {
  if (providerId === "axelar") return buildAxelarRoute(direction);
  if (providerId === "ccip") return buildCcipRoute(direction);
  return buildLayerzeroRoute(direction);
};

export const getBridgeProvider = (providerId: BridgeProviderId) =>
  BRIDGE_PROVIDERS.find(provider => provider.id === providerId) ?? BRIDGE_PROVIDERS[0];

export const getRouteConfigIssue = (route: BridgeRoute) => {
  for (const field of route.requiredFields) {
    const issue = getFieldIssue(field);
    if (issue) return issue;
  }
  return undefined;
};

export const getRouteConfigIssues = (route: BridgeRoute) =>
  route.requiredFields
    .map(field => ({ field, issue: getFieldIssue(field) }))
    .filter((entry): entry is { field: BridgeRequiredField; issue: string } => Boolean(entry.issue));

export const getDefaultBridgeDirection = (): BridgeDirection => "sepolia-to-hedera";

export const getOppositeDirection = (direction: BridgeDirection): BridgeDirection =>
  direction === "sepolia-to-hedera" ? "hedera-to-sepolia" : "sepolia-to-hedera";

export const BRIDGE_CHAIN_IDS = [HEDERA_TESTNET_CHAIN_ID, SEPOLIA_CHAIN_ID] as const;
