"use client";

import { isQuotableDecimalAmount, normalizeBridgeAmount } from "./amount";
import { ccipRouterAbi } from "./ccipAbi";
import { buildCcipMessage, getHederaRelayValue } from "./ccipMessage";
import { HEDERA_TESTNET_CHAIN_ID } from "./constants";
import { erc20BridgeAbi } from "./erc20Abi";
import type { BridgeRoute } from "./types";
import { useQuery } from "@tanstack/react-query";
import { formatUnits, parseUnits } from "viem";
import type { Address, PublicClient } from "viem";
import { usePublicClient } from "wagmi";

export type CcipQuoteStatus =
  | "idle"
  | "unsupported"
  | "missing_config"
  | "invalid_amount"
  | "quoting"
  | "quoted"
  | "failed";

export type CcipQuote = {
  status: CcipQuoteStatus;
  isUpdating?: boolean;
  reason?: string;
  amountInBaseUnits?: bigint;
  tokenDecimals?: number;
  nativeFee?: bigint;
  nativeFeeLabel?: string;
  hederaRelayValue?: bigint;
};

type UseCcipQuoteArgs = {
  amount: string;
  enabled: boolean;
  recipient?: Address;
  route: BridgeRoute;
};

const initialQuote: CcipQuote = { status: "idle" };

const getQuoteFailureReason = () => "Unable to quote CCIP fee. Check the route config and RPC connection.";

const getCcipFeeQuote = async ({
  amount,
  recipient,
  route,
  sourceClient,
}: {
  amount: string;
  recipient: Address;
  route: BridgeRoute;
  sourceClient: PublicClient;
}): Promise<CcipQuote> => {
  if (!route.ccip) return { status: "missing_config", reason: "CCIP route metadata is missing." };

  const tokenDecimals = await sourceClient.readContract({
    address: route.ccip.sourceTokenAddress,
    abi: erc20BridgeAbi,
    functionName: "decimals",
  });
  const amountInBaseUnits = parseUnits(normalizeBridgeAmount(amount), tokenDecimals);

  if (amountInBaseUnits <= 0n) {
    return { status: "invalid_amount", reason: "Enter an amount greater than zero." };
  }

  const message = buildCcipMessage({ amountInBaseUnits, recipient, route });
  if (!message) return { status: "missing_config", reason: "CCIP route metadata is missing." };

  const nativeFee = await sourceClient.readContract({
    address: route.ccip.sourceRouterAddress,
    abi: ccipRouterAbi,
    functionName: "getFee",
    args: [BigInt(route.ccip.destinationChainSelector), message],
  });

  const isHederaSource = route.sourceChainId === HEDERA_TESTNET_CHAIN_ID;
  return {
    status: "quoted",
    amountInBaseUnits,
    tokenDecimals,
    nativeFee,
    nativeFeeLabel: `${formatUnits(nativeFee, isHederaSource ? 8 : 18)} ${isHederaSource ? "HBAR" : "ETH"}`,
    hederaRelayValue: isHederaSource ? getHederaRelayValue(nativeFee) : undefined,
  };
};

export const useCcipQuote = ({ amount, enabled, recipient, route }: UseCcipQuoteArgs): CcipQuote => {
  const sourceClient = usePublicClient({ chainId: route.sourceChainId });
  const normalizedAmount = amount.trim();
  const hasAmount = normalizedAmount.length > 0;
  const isUnsupported = route.providerId !== "ccip";
  const isInvalidAmount = hasAmount && !isQuotableDecimalAmount(normalizedAmount);
  const queryEnabled = Boolean(
    enabled && !isUnsupported && route.ccip && sourceClient && recipient && hasAmount && !isInvalidAmount,
  );

  const quoteQuery = useQuery({
    queryKey: [
      "ccipQuote",
      route.direction,
      route.sourceChainId,
      route.destinationChainId,
      route.ccip?.sourceTokenAddress,
      route.ccip?.sourceRouterAddress,
      route.ccip?.destinationChainSelector,
      recipient,
      normalizedAmount,
    ],
    enabled: queryEnabled,
    gcTime: 60_000,
    queryFn: () =>
      getCcipFeeQuote({
        amount: normalizedAmount,
        recipient: recipient as Address,
        route,
        sourceClient: sourceClient as PublicClient,
      }),
    placeholderData: previousData => previousData,
    retry: 1,
    staleTime: 15_000,
  });

  if (!enabled || !hasAmount) return initialQuote;
  if (isUnsupported) return { status: "unsupported", reason: "Send adapter is not available for this provider yet." };
  if (!route.ccip) return { status: "missing_config", reason: "CCIP route metadata is missing." };
  if (isInvalidAmount) return { status: "invalid_amount", reason: "Enter a valid decimal amount." };
  if (!sourceClient || !recipient) return initialQuote;
  if (quoteQuery.isError) return { status: "failed", reason: getQuoteFailureReason() };
  if (quoteQuery.isLoading || (quoteQuery.isFetching && !quoteQuery.data)) return { status: "quoting" };
  if (quoteQuery.isFetching && quoteQuery.data) return { ...quoteQuery.data, isUpdating: true };

  return quoteQuery.data ?? initialQuote;
};
