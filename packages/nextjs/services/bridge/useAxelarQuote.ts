"use client";

import { isQuotableDecimalAmount, normalizeBridgeAmount } from "./amount";
import { HEDERA_TESTNET_CHAIN_ID } from "./constants";
import { erc20BridgeAbi } from "./erc20Abi";
import type { BridgeRoute } from "./types";
import { useQuery } from "@tanstack/react-query";
import { formatUnits, parseUnits } from "viem";
import type { PublicClient } from "viem";
import { usePublicClient } from "wagmi";

export type AxelarQuoteStatus =
  | "idle"
  | "unsupported"
  | "missing_config"
  | "invalid_amount"
  | "quoting"
  | "quoted"
  | "failed";

export type AxelarQuote = {
  status: AxelarQuoteStatus;
  reason?: string;
  amountInBaseUnits?: bigint;
  tokenDecimals?: number;
  nativeFee?: bigint;
  nativeFeeLabel?: string;
  gasValue?: bigint;
};

type UseAxelarQuoteArgs = {
  amount: string;
  enabled: boolean;
  route: BridgeRoute;
};

const initialQuote: AxelarQuote = { status: "idle" };

const getQuoteFailureReason = () => "Unable to prepare Axelar fee. Check the route config and RPC connection.";

const getNativeFeeLabel = (route: BridgeRoute, nativeFee: bigint) => {
  const isHederaSource = route.sourceChainId === HEDERA_TESTNET_CHAIN_ID;
  return `${formatUnits(nativeFee, 18)} ${isHederaSource ? "HBAR" : "ETH"}`;
};

const getAxelarQuote = async ({
  amount,
  route,
  sourceClient,
}: {
  amount: string;
  route: BridgeRoute;
  sourceClient: PublicClient;
}): Promise<AxelarQuote> => {
  if (!route.axelar) return { status: "missing_config", reason: "Axelar route metadata is missing." };

  const tokenDecimals = await sourceClient.readContract({
    address: route.axelar.sourceTokenAddress,
    abi: erc20BridgeAbi,
    functionName: "decimals",
  });
  const amountInBaseUnits = parseUnits(normalizeBridgeAmount(amount), tokenDecimals);

  if (amountInBaseUnits <= 0n) {
    return { status: "invalid_amount", reason: "Enter an amount greater than zero." };
  }

  const nativeFee = BigInt(route.axelar.nativeFee);
  const gasValue = BigInt(route.axelar.gasValue);

  return {
    status: "quoted",
    amountInBaseUnits,
    tokenDecimals,
    nativeFee,
    nativeFeeLabel: getNativeFeeLabel(route, nativeFee),
    gasValue,
  };
};

export const useAxelarQuote = ({ amount, enabled, route }: UseAxelarQuoteArgs): AxelarQuote => {
  const sourceClient = usePublicClient({ chainId: route.sourceChainId });
  const normalizedAmount = amount.trim();
  const hasAmount = normalizedAmount.length > 0;
  const isUnsupported = route.providerId !== "axelar";
  const isInvalidAmount = hasAmount && !isQuotableDecimalAmount(normalizedAmount);
  const queryEnabled = Boolean(
    enabled && !isUnsupported && route.axelar && sourceClient && hasAmount && !isInvalidAmount,
  );

  const quoteQuery = useQuery({
    queryKey: [
      "axelarQuote",
      route.direction,
      route.sourceChainId,
      route.destinationChainId,
      route.axelar?.sourceTokenAddress,
      route.axelar?.nativeFee,
      route.axelar?.gasValue,
      normalizedAmount,
    ],
    enabled: queryEnabled,
    gcTime: 60_000,
    queryFn: () =>
      getAxelarQuote({
        amount: normalizedAmount,
        route,
        sourceClient: sourceClient as PublicClient,
      }),
    retry: 1,
    staleTime: 15_000,
  });

  if (!enabled || !hasAmount) return initialQuote;
  if (isUnsupported) return { status: "unsupported", reason: "Send adapter is not available for this provider yet." };
  if (!route.axelar) return { status: "missing_config", reason: "Axelar route metadata is missing." };
  if (isInvalidAmount) return { status: "invalid_amount", reason: "Enter a valid decimal amount." };
  if (!sourceClient) return initialQuote;
  if (quoteQuery.isLoading || quoteQuery.isFetching) return { status: "quoting" };
  if (quoteQuery.isError) return { status: "failed", reason: getQuoteFailureReason() };

  return quoteQuery.data ?? initialQuote;
};
