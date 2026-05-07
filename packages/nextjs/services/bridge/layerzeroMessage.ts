import { HEDERA_TESTNET_CHAIN_ID } from "./constants";
import type { BridgeRoute } from "./types";
import { concatHex, encodeAbiParameters, formatUnits, numberToHex, padHex, size } from "viem";
import type { Address, Hex } from "viem";

export const LAYERZERO_DEFAULT_RECEIVE_GAS = "80000";
export const LAYERZERO_DEFAULT_MIN_AMOUNT_BPS = "9000";
export const LAYERZERO_BPS_DENOMINATOR = 10_000n;
export const LAYERZERO_TINYBAR_TO_WEI_SCALE = 10_000_000_000n;

export type LayerZeroSendParam = {
  dstEid: number;
  to: Hex;
  amountLD: bigint;
  minAmountLD: bigint;
  extraOptions: Hex;
  composeMsg: Hex;
  oftCmd: Hex;
};

const asUint16Hex = (value: bigint) => padHex(numberToHex(value), { size: 2 });
const asUint128Hex = (value: bigint) => padHex(numberToHex(value), { size: 16 });

export const addressToLayerZeroBytes32 = (address: Address) => encodeAbiParameters([{ type: "address" }], [address]);

export const buildLayerZeroOptions = ({
  receiveGas,
  receiveValue = 0n,
}: {
  receiveGas: bigint;
  receiveValue?: bigint;
}) => {
  const optionPayload =
    receiveValue > 0n ? concatHex([asUint128Hex(receiveGas), asUint128Hex(receiveValue)]) : asUint128Hex(receiveGas);

  return concatHex(["0x0003", "0x01", asUint16Hex(BigInt(size(optionPayload) + 1)), "0x01", optionPayload]);
};

export const getLayerZeroMinAmount = (amountInBaseUnits: bigint, minAmountBps: bigint) =>
  (amountInBaseUnits * minAmountBps) / LAYERZERO_BPS_DENOMINATOR;

export const buildLayerZeroSendParam = ({
  amountInBaseUnits,
  minAmountBps,
  receiveGas,
  recipient,
  route,
}: {
  amountInBaseUnits: bigint;
  minAmountBps: bigint;
  receiveGas: bigint;
  recipient: Address;
  route: BridgeRoute;
}): LayerZeroSendParam | undefined => {
  if (!route.layerzero) return undefined;

  return {
    dstEid: route.layerzero.destinationEid,
    to: addressToLayerZeroBytes32(recipient),
    amountLD: amountInBaseUnits,
    minAmountLD: getLayerZeroMinAmount(amountInBaseUnits, minAmountBps),
    extraOptions: buildLayerZeroOptions({ receiveGas }),
    composeMsg: "0x",
    oftCmd: "0x",
  };
};

export const getLayerZeroNativeFeeLabel = (route: BridgeRoute, nativeFee: bigint) => {
  const isHederaSource = route.sourceChainId === HEDERA_TESTNET_CHAIN_ID;
  return `${formatUnits(nativeFee, isHederaSource ? 8 : 18)} ${isHederaSource ? "HBAR" : "ETH"}`;
};

export const getLayerZeroNativeFeeValue = (route: BridgeRoute, nativeFee: bigint) =>
  route.sourceChainId === HEDERA_TESTNET_CHAIN_ID ? nativeFee * LAYERZERO_TINYBAR_TO_WEI_SCALE : nativeFee;
