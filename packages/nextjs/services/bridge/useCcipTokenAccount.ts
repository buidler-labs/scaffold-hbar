"use client";

import { useMemo } from "react";
import { erc20BridgeAbi } from "./ccipAbi";
import { HEDERA_TESTNET_CHAIN_ID } from "./constants";
import type { BridgeChainId, BridgeRoute } from "./types";
import { useQuery } from "@tanstack/react-query";
import { formatUnits } from "viem";
import type { Address, PublicClient } from "viem";
import { usePublicClient } from "wagmi";

export type CcipTokenAccountStatus = "idle" | "checking" | "ready" | "failed";

export type CcipTokenBalance = {
  balance?: bigint;
  balanceLabel?: string;
  chainId: BridgeChainId;
  decimals?: number;
  isHtsToken: boolean;
  label: "Source token" | "Destination token";
  tokenAddress?: Address;
};

type UseCcipTokenAccountArgs = {
  account?: Address;
  enabled: boolean;
  route: BridgeRoute;
};

const TOKEN_NOT_ASSOCIATED_ERROR = "TOKEN_NOT_ASSOCIATED_TO_ACCOUNT";

const isTokenNotAssociatedError = (error: unknown) =>
  error instanceof Error && error.message.includes(TOKEN_NOT_ASSOCIATED_ERROR);

const getDisplayTokenAddress = (route: BridgeRoute, side: "source" | "destination") => {
  if (!route.ccip) return undefined;

  if (side === "source") {
    return route.sourceChainId === HEDERA_TESTNET_CHAIN_ID
      ? (route.ccip.sourceHtsTokenAddress ?? route.ccip.sourceTokenAddress)
      : route.ccip.sourceTokenAddress;
  }

  return route.destinationChainId === HEDERA_TESTNET_CHAIN_ID
    ? (route.ccip.destinationHtsTokenAddress ?? route.ccip.destinationTokenAddress)
    : route.ccip.destinationTokenAddress;
};

const readTokenBalance = async ({
  account,
  chainId,
  client,
  isHtsToken,
  label,
  tokenAddress,
}: {
  account: Address;
  chainId: BridgeChainId;
  client: PublicClient;
  isHtsToken: boolean;
  label: CcipTokenBalance["label"];
  tokenAddress?: Address;
}): Promise<CcipTokenBalance> => {
  if (!tokenAddress) return { chainId, isHtsToken, label };

  const decimals = await client.readContract({
    address: tokenAddress,
    abi: erc20BridgeAbi,
    functionName: "decimals",
  });

  try {
    const balance = await client.readContract({
      address: tokenAddress,
      abi: erc20BridgeAbi,
      functionName: "balanceOf",
      args: [account],
    });

    return {
      balance,
      balanceLabel: formatUnits(balance, decimals),
      chainId,
      decimals,
      isHtsToken,
      label,
      tokenAddress,
    };
  } catch (error) {
    if (isHtsToken && isTokenNotAssociatedError(error)) {
      return {
        chainId,
        decimals,
        isHtsToken,
        label,
        tokenAddress,
      };
    }

    throw error;
  }
};

export const useCcipTokenAccount = ({ account, enabled, route }: UseCcipTokenAccountArgs) => {
  const sourceClient = usePublicClient({ chainId: route.sourceChainId });
  const destinationClient = usePublicClient({ chainId: route.destinationChainId });

  const sourceTokenAddress = getDisplayTokenAddress(route, "source");
  const destinationTokenAddress = getDisplayTokenAddress(route, "destination");
  const sourceIsHtsToken =
    route.sourceChainId === HEDERA_TESTNET_CHAIN_ID && Boolean(route.ccip?.sourceHtsTokenAddress);
  const destinationIsHtsToken =
    route.destinationChainId === HEDERA_TESTNET_CHAIN_ID && Boolean(route.ccip?.destinationHtsTokenAddress);

  const tokenQuery = useQuery({
    queryKey: [
      "ccipTokenAccount",
      account,
      route.direction,
      route.sourceChainId,
      route.destinationChainId,
      sourceTokenAddress,
      destinationTokenAddress,
    ],
    enabled: Boolean(
      enabled && account && route.providerId === "ccip" && route.ccip && sourceClient && destinationClient,
    ),
    queryFn: async () => {
      const [source, destination] = await Promise.all([
        readTokenBalance({
          account: account as Address,
          chainId: route.sourceChainId,
          client: sourceClient as PublicClient,
          isHtsToken: sourceIsHtsToken,
          label: "Source token",
          tokenAddress: sourceTokenAddress,
        }),
        readTokenBalance({
          account: account as Address,
          chainId: route.destinationChainId,
          client: destinationClient as PublicClient,
          isHtsToken: destinationIsHtsToken,
          label: "Destination token",
          tokenAddress: destinationTokenAddress,
        }),
      ]);

      return { destination, source };
    },
    retry: 1,
    staleTime: 15_000,
  });

  const showHtsAssociationNotice = Boolean(
    route.ccip &&
    ((route.sourceChainId === HEDERA_TESTNET_CHAIN_ID && route.ccip.sourceHtsTokenAddress) ||
      (route.destinationChainId === HEDERA_TESTNET_CHAIN_ID && route.ccip.destinationHtsTokenAddress)),
  );

  const status = useMemo<CcipTokenAccountStatus>(() => {
    if (!enabled || route.providerId !== "ccip" || !account) return "idle";
    if (tokenQuery.isLoading || tokenQuery.isFetching) return "checking";
    if (tokenQuery.isError) return "failed";
    return "ready";
  }, [account, enabled, route.providerId, tokenQuery.isError, tokenQuery.isFetching, tokenQuery.isLoading]);

  return {
    destinationToken: tokenQuery.data?.destination,
    showHtsAssociationNotice,
    sourceToken: tokenQuery.data?.source,
    status,
  };
};
