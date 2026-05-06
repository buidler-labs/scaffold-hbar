import { HEDERA_TESTNET_CHAIN_ID } from "./constants";
import type { BridgeRoute } from "./types";
import { encodeAbiParameters, zeroAddress } from "viem";
import type { Address } from "viem";

const CCIP_EXTRA_ARGS_V2_TAG = "0x181dcf10";

export const CCIP_EXTRA_ARGS_ALLOW_OUT_OF_ORDER = `${CCIP_EXTRA_ARGS_V2_TAG}${encodeAbiParameters(
  [
    { type: "uint256", name: "gasLimit" },
    { type: "bool", name: "allowOutOfOrderExecution" },
  ],
  [0n, true],
).slice(2)}` as const;

export const HEDERA_FEE_BUFFER_BPS = 12_500n;
export const BPS_DENOMINATOR = 10_000n;
export const TINYBAR_TO_WEI_SCALE = 10_000_000_000n;

export const getHederaRelayValue = (tinybarFee: bigint) =>
  ((tinybarFee * HEDERA_FEE_BUFFER_BPS + BPS_DENOMINATOR - 1n) / BPS_DENOMINATOR) * TINYBAR_TO_WEI_SCALE;

export const getCcipNativeFeeValue = (route: BridgeRoute, nativeFee: bigint) =>
  route.sourceChainId === HEDERA_TESTNET_CHAIN_ID ? getHederaRelayValue(nativeFee) : nativeFee;

export const buildCcipMessage = ({
  amountInBaseUnits,
  recipient,
  route,
}: {
  amountInBaseUnits: bigint;
  recipient: Address;
  route: BridgeRoute;
}) => {
  if (!route.ccip) return undefined;

  return {
    receiver: encodeAbiParameters([{ type: "address" }], [recipient]),
    data: "0x",
    tokenAmounts: [{ token: route.ccip.sourceTokenAddress, amount: amountInBaseUnits }],
    feeToken: zeroAddress,
    extraArgs: CCIP_EXTRA_ARGS_ALLOW_OUT_OF_ORDER,
  } as const;
};
