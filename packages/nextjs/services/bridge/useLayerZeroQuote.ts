"use client";

import { isQuotableDecimalAmount, normalizeBridgeAmount } from "./amount";
import { erc20BridgeAbi } from "./erc20Abi";
import { layerZeroOftAbi } from "./layerzeroAbi";
import {
  LAYERZERO_DEFAULT_MIN_AMOUNT_BPS,
  LAYERZERO_DEFAULT_RECEIVE_GAS,
  buildLayerZeroSendParam,
  getLayerZeroNativeFeeLabel,
} from "./layerzeroMessage";
import type { BridgeQuoteState, BridgeRoute } from "./types";
import { useQuery } from "@tanstack/react-query";
import { parseUnits } from "viem";
import type { Address, PublicClient } from "viem";
import { usePublicClient } from "wagmi";

export type LayerZeroQuote = BridgeQuoteState;

type UseLayerZeroQuoteArgs = {
  amount: string;
  enabled: boolean;
  recipient?: Address;
  route: BridgeRoute;
};

const initialQuote: LayerZeroQuote = { status: "idle" };

const getQuoteFailureReason = () => "Unable to quote LayerZero fee. Check the route config and RPC connection.";

const getLayerZeroQuote = async ({
  amount,
  recipient,
  route,
  sourceClient,
}: {
  amount: string;
  recipient: Address;
  route: BridgeRoute;
  sourceClient: PublicClient;
}): Promise<LayerZeroQuote> => {
  if (!route.layerzero) return { status: "missing_config", reason: "LayerZero route metadata is missing." };

  const tokenDecimals = await sourceClient.readContract({
    address: route.layerzero.sourceTokenAddress,
    abi: erc20BridgeAbi,
    functionName: "decimals",
  });
  const amountInBaseUnits = parseUnits(normalizeBridgeAmount(amount), tokenDecimals);

  if (amountInBaseUnits <= 0n) {
    return { status: "invalid_amount", reason: "Enter an amount greater than zero." };
  }

  const sendParam = buildLayerZeroSendParam({
    amountInBaseUnits,
    minAmountBps: BigInt(route.layerzero.minAmountBps || LAYERZERO_DEFAULT_MIN_AMOUNT_BPS),
    receiveGas: BigInt(route.layerzero.receiveGas || LAYERZERO_DEFAULT_RECEIVE_GAS),
    recipient,
    route,
  });
  if (!sendParam) return { status: "missing_config", reason: "LayerZero route metadata is missing." };

  await sourceClient.readContract({
    address: route.layerzero.sourceOftAddress,
    abi: layerZeroOftAbi,
    functionName: "quoteOFT",
    args: [sendParam],
  });

  const fee = await sourceClient.readContract({
    address: route.layerzero.sourceOftAddress,
    abi: layerZeroOftAbi,
    functionName: "quoteSend",
    args: [sendParam, false],
  });

  return {
    status: "quoted",
    amountInBaseUnits,
    tokenDecimals,
    nativeFee: fee.nativeFee,
    nativeFeeLabel: getLayerZeroNativeFeeLabel(route, fee.nativeFee),
  };
};

export const useLayerZeroQuote = ({ amount, enabled, recipient, route }: UseLayerZeroQuoteArgs): LayerZeroQuote => {
  const sourceClient = usePublicClient({ chainId: route.sourceChainId });
  const normalizedAmount = amount.trim();
  const hasAmount = normalizedAmount.length > 0;
  const isUnsupported = route.providerId !== "layerzero";
  const isInvalidAmount = hasAmount && !isQuotableDecimalAmount(normalizedAmount);
  const queryEnabled = Boolean(
    enabled && !isUnsupported && route.layerzero && sourceClient && recipient && hasAmount && !isInvalidAmount,
  );

  const quoteQuery = useQuery({
    queryKey: [
      "layerZeroQuote",
      route.direction,
      route.sourceChainId,
      route.destinationChainId,
      route.layerzero?.sourceOftAddress,
      route.layerzero?.sourceTokenAddress,
      route.layerzero?.destinationEid,
      route.layerzero?.receiveGas,
      route.layerzero?.minAmountBps,
      recipient,
      normalizedAmount,
    ],
    enabled: queryEnabled,
    gcTime: 60_000,
    queryFn: () =>
      getLayerZeroQuote({
        amount: normalizedAmount,
        recipient: recipient as Address,
        route,
        sourceClient: sourceClient as PublicClient,
      }),
    retry: 1,
    staleTime: 15_000,
  });

  if (!enabled || !hasAmount) return initialQuote;
  if (isUnsupported) return { status: "unsupported", reason: "Send adapter is not available for this provider yet." };
  if (!route.layerzero) return { status: "missing_config", reason: "LayerZero route metadata is missing." };
  if (isInvalidAmount) return { status: "invalid_amount", reason: "Enter a valid decimal amount." };
  if (!sourceClient || !recipient) return initialQuote;
  if (quoteQuery.isLoading || quoteQuery.isFetching) return { status: "quoting" };
  if (quoteQuery.isError) return { status: "failed", reason: getQuoteFailureReason() };

  return quoteQuery.data ?? initialQuote;
};
