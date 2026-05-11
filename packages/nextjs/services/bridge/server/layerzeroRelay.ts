import { getBridgeRoute } from "../registry";
import type { BridgeDirection } from "../types";
import "server-only";
import {
  BaseError,
  createPublicClient,
  createWalletClient,
  decodeAbiParameters,
  getAddress,
  http,
  isHash,
  isHex,
  keccak256,
  toBytes,
} from "viem";
import type { Address, Hex, TransactionReceipt } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hederaTestnet, sepolia } from "viem/chains";

const LAYERZERO_RELAY_LZRECEIVE_GAS = 500_000n;
const HEDERA_RELAY_MIN_GAS_PRICE_WEI = 1_000_000_000_000n;
const LAYERZERO_INVALID_NONCE_ERROR_SELECTOR = "0xc09b6350";
const PACKET_SENT_TOPIC = keccak256(toBytes("PacketSent(bytes,bytes,address)"));

const simpleDvnAbi = [
  {
    type: "function",
    name: "verify",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_message", type: "bytes" },
      { name: "_nonce", type: "uint64" },
      { name: "_srcEid", type: "uint32" },
      { name: "_remoteOApp", type: "bytes32" },
      { name: "_dstEid", type: "uint32" },
      { name: "_localOApp", type: "address" },
    ],
    outputs: [],
  },
] as const;

const simpleExecutorAbi = [
  {
    type: "error",
    name: "LZ_InvalidNonce",
    inputs: [{ name: "nonce", type: "uint64" }],
  },
  {
    type: "function",
    name: "commitAndExecute",
    stateMutability: "payable",
    inputs: [
      { name: "_receiveLib", type: "address" },
      {
        name: "_lzReceiveParam",
        type: "tuple",
        components: [
          {
            name: "origin",
            type: "tuple",
            components: [
              { name: "srcEid", type: "uint32" },
              { name: "sender", type: "bytes32" },
              { name: "nonce", type: "uint64" },
            ],
          },
          { name: "receiver", type: "address" },
          { name: "guid", type: "bytes32" },
          { name: "message", type: "bytes" },
          { name: "extraData", type: "bytes" },
          { name: "gas", type: "uint256" },
          { name: "value", type: "uint256" },
        ],
      },
      {
        name: "_nativeDropParams",
        type: "tuple[]",
        components: [
          { name: "_receiver", type: "address" },
          { name: "_amount", type: "uint256" },
        ],
      },
    ],
    outputs: [],
  },
] as const;

type RelayConfig = {
  destinationChain: typeof hederaTestnet | typeof sepolia;
  destinationRpcUrl: string;
  dvnAddress: Address;
  executorAddress: Address;
  receiveUlnAddress: Address;
  relayGas: bigint;
  sourceChain: typeof hederaTestnet | typeof sepolia;
  sourceRpcUrl: string;
};

export type LayerZeroRelayRequest = {
  direction: BridgeDirection;
  txHash: Hex;
};

export type LayerZeroRelayResult = {
  executeTxHash: Hex;
  guid: Hex;
  verifyTxHash: Hex;
};

export type LayerZeroPacket = {
  dstEid: number;
  guid: Hex;
  message: Hex;
  nonce: bigint;
  receiverAddress: Address;
  receiverB32: Hex;
  senderB32: Hex;
  srcEid: number;
};

export class LayerZeroRelayConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LayerZeroRelayConfigError";
  }
}

export class LayerZeroRelayInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LayerZeroRelayInputError";
  }
}

const getEnv = (name: string) => {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
};

const getPrivateKey = () => {
  const value = getEnv("LAYERZERO_RELAY_PRIVATE_KEY") ?? getEnv("RELAY_PRIVATE_KEY") ?? getEnv("PRIVATE_KEY");
  const normalizedValue = value?.startsWith("0x") ? value : `0x${value}`;

  if (!value || !isHex(normalizedValue) || normalizedValue.length !== 66) {
    throw new LayerZeroRelayConfigError("Missing or invalid LAYERZERO_RELAY_PRIVATE_KEY.");
  }

  return normalizedValue;
};

const getHederaRelayGasPrice = async (destinationClient: ReturnType<typeof createPublicClient>) => {
  const rpcGasPrice = await destinationClient.getGasPrice();
  return rpcGasPrice > HEDERA_RELAY_MIN_GAS_PRICE_WEI ? rpcGasPrice : HEDERA_RELAY_MIN_GAS_PRICE_WEI;
};

const getLayerZeroInvalidNonce = (error: unknown) => {
  if (!(error instanceof BaseError)) return undefined;

  const revertError = error.walk(
    cause =>
      cause instanceof BaseError &&
      ("data" in cause || "signature" in cause) &&
      Boolean((cause as { data?: unknown }).data || (cause as { signature?: unknown }).signature),
  ) as (BaseError & { data?: unknown; signature?: unknown }) | undefined;
  const rawData = typeof revertError?.data === "string" ? revertError.data : undefined;
  const signature = typeof revertError?.signature === "string" ? revertError.signature : rawData?.slice(0, 10);

  if (signature !== LAYERZERO_INVALID_NONCE_ERROR_SELECTOR) return undefined;

  const encodedNonce = rawData?.slice(10);
  if (!encodedNonce) return undefined;

  try {
    return BigInt(`0x${encodedNonce}`).toString();
  } catch {
    return undefined;
  }
};

const getRelayExecutionError = (error: unknown, attemptedNonce: bigint) => {
  const missingNonce = getLayerZeroInvalidNonce(error);

  if (!missingNonce) return error;

  return new LayerZeroRelayInputError(
    `LayerZero destination is missing earlier message nonce ${missingNonce}. Relay previous LayerZero messages before delivering nonce ${attemptedNonce.toString()}.`,
  );
};

const getRelayConfig = (direction: BridgeDirection): RelayConfig => {
  const sepoliaRpcUrl = getEnv("NEXT_PUBLIC_SEPOLIA_RPC_URL") ?? "https://ethereum-sepolia-rpc.publicnode.com";
  const hederaRpcUrl = getEnv("NEXT_PUBLIC_HEDERA_TESTNET_RPC_URL") ?? "https://testnet.hashio.io/api";
  const route = getBridgeRoute("layerzero", direction);

  if (!route.layerzero) {
    throw new LayerZeroRelayConfigError("LayerZero route metadata is missing.");
  }

  if (direction === "sepolia-to-hedera") {
    return {
      destinationChain: hederaTestnet,
      destinationRpcUrl: hederaRpcUrl,
      dvnAddress: route.layerzero.destinationWorkersDvnAddress,
      executorAddress: route.layerzero.destinationWorkersExecutorAddress,
      receiveUlnAddress: route.layerzero.destinationReceiveUlnAddress,
      relayGas: BigInt(route.layerzero.relayReceiveGas ?? LAYERZERO_RELAY_LZRECEIVE_GAS.toString()),
      sourceChain: sepolia,
      sourceRpcUrl: sepoliaRpcUrl,
    };
  }

  return {
    destinationChain: sepolia,
    destinationRpcUrl: sepoliaRpcUrl,
    dvnAddress: route.layerzero.destinationWorkersDvnAddress,
    executorAddress: route.layerzero.destinationWorkersExecutorAddress,
    receiveUlnAddress: route.layerzero.destinationReceiveUlnAddress,
    relayGas: BigInt(route.layerzero.relayReceiveGas ?? LAYERZERO_RELAY_LZRECEIVE_GAS.toString()),
    sourceChain: hederaTestnet,
    sourceRpcUrl: hederaRpcUrl,
  };
};

const readHex = (value: string, start: number, length: number) => `0x${value.slice(start, start + length)}` as Hex;

export const parseLayerZeroPacketSent = (receipt: TransactionReceipt): LayerZeroPacket => {
  const packetLog = receipt.logs.find(log => log.topics[0]?.toLowerCase() === PACKET_SENT_TOPIC.toLowerCase());
  if (!packetLog) {
    throw new LayerZeroRelayInputError("LayerZero PacketSent event was not found in the source transaction.");
  }

  const [encodedPayload] = decodeAbiParameters(
    [{ type: "bytes" }, { type: "bytes" }, { type: "address" }],
    packetLog.data,
  );
  const payload = encodedPayload.slice(2);

  if (payload.length < 226) {
    throw new LayerZeroRelayInputError("LayerZero PacketSent payload is malformed.");
  }

  const receiverB32 = readHex(payload, 98, 64);

  return {
    dstEid: Number(BigInt(readHex(payload, 90, 8))),
    guid: readHex(payload, 162, 64),
    message: `0x${payload.slice(226)}` as Hex,
    nonce: BigInt(readHex(payload, 2, 16)),
    receiverAddress: getAddress(`0x${receiverB32.slice(-40)}`),
    receiverB32,
    senderB32: readHex(payload, 26, 64),
    srcEid: Number(BigInt(readHex(payload, 18, 8))),
  };
};

export const relayLayerZeroPacket = async ({
  direction,
  txHash,
}: LayerZeroRelayRequest): Promise<LayerZeroRelayResult> => {
  if (!isHash(txHash)) {
    throw new LayerZeroRelayInputError("Invalid source transaction hash.");
  }

  const config = getRelayConfig(direction);
  const account = privateKeyToAccount(getPrivateKey());
  const sourceClient = createPublicClient({
    chain: config.sourceChain,
    transport: http(config.sourceRpcUrl),
  });
  const destinationClient = createPublicClient({
    chain: config.destinationChain,
    transport: http(config.destinationRpcUrl),
  });
  const walletClient = createWalletClient({
    account,
    chain: config.destinationChain,
    transport: http(config.destinationRpcUrl),
  });
  const packet = parseLayerZeroPacketSent(await sourceClient.getTransactionReceipt({ hash: txHash }));
  const hederaTxOverrides =
    config.destinationChain.id === hederaTestnet.id
      ? {
          gasPrice: await getHederaRelayGasPrice(destinationClient),
        }
      : {};

  const verifyTxHash = await walletClient.writeContract({
    account,
    address: config.dvnAddress,
    abi: simpleDvnAbi,
    functionName: "verify",
    args: [packet.message, packet.nonce, packet.srcEid, packet.senderB32, packet.dstEid, packet.receiverAddress],
    ...hederaTxOverrides,
  });
  await destinationClient.waitForTransactionReceipt({ hash: verifyTxHash });

  let executeTxHash: Hex;
  try {
    executeTxHash = await walletClient.writeContract({
      account,
      address: config.executorAddress,
      abi: simpleExecutorAbi,
      functionName: "commitAndExecute",
      args: [
        config.receiveUlnAddress,
        {
          origin: {
            srcEid: packet.srcEid,
            sender: packet.senderB32,
            nonce: packet.nonce,
          },
          receiver: packet.receiverAddress,
          guid: packet.guid,
          message: packet.message,
          extraData: "0x",
          gas: config.relayGas,
          value: 0n,
        },
        [],
      ],
      ...hederaTxOverrides,
    });
  } catch (error) {
    throw getRelayExecutionError(error, packet.nonce);
  }
  await destinationClient.waitForTransactionReceipt({ hash: executeTxHash });

  return {
    executeTxHash,
    guid: packet.guid,
    verifyTxHash,
  };
};
