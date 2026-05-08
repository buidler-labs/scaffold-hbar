"use client";

import { useCallback, useMemo } from "react";
import { erc20BridgeAbi } from "./erc20Abi";
import type { BridgeChainId } from "./types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatUnits } from "viem";
import type { Address, PublicClient } from "viem";
import { usePublicClient } from "wagmi";

export type BridgeTokenAccountStatus = "idle" | "checking" | "ready" | "failed";

export type BridgeTokenBalance = {
  balance?: bigint;
  balanceLabel?: string;
  chainId: BridgeChainId;
  decimals?: number;
  isHtsToken: boolean;
  label: "Source token" | "Destination token";
  tokenAddress?: Address;
};

type BridgeTokenSide = {
  chainId: BridgeChainId;
  isHtsToken: boolean;
  tokenAddress?: Address;
};

type UseBridgeTokenAccountArgs = {
  account?: Address;
  destination: BridgeTokenSide;
  enabled: boolean;
  queryKey: readonly unknown[];
  showHtsAssociationNotice: boolean;
  source: BridgeTokenSide;
};

const TOKEN_NOT_ASSOCIATED_ERROR = "TOKEN_NOT_ASSOCIATED_TO_ACCOUNT";

const isTokenNotAssociatedError = (error: unknown) =>
  error instanceof Error && error.message.includes(TOKEN_NOT_ASSOCIATED_ERROR);

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
  label: BridgeTokenBalance["label"];
  tokenAddress?: Address;
}): Promise<BridgeTokenBalance> => {
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

export const useBridgeTokenAccount = ({
  account,
  destination,
  enabled,
  queryKey,
  showHtsAssociationNotice,
  source,
}: UseBridgeTokenAccountArgs) => {
  const queryClient = useQueryClient();
  const sourceClient = usePublicClient({ chainId: source.chainId });
  const destinationClient = usePublicClient({ chainId: destination.chainId });

  const tokenQuery = useQuery({
    queryKey,
    enabled: Boolean(enabled && account && sourceClient && destinationClient),
    queryFn: async () => {
      const [sourceToken, destinationToken] = await Promise.all([
        readTokenBalance({
          account: account as Address,
          chainId: source.chainId,
          client: sourceClient as PublicClient,
          isHtsToken: source.isHtsToken,
          label: "Source token",
          tokenAddress: source.tokenAddress,
        }),
        readTokenBalance({
          account: account as Address,
          chainId: destination.chainId,
          client: destinationClient as PublicClient,
          isHtsToken: destination.isHtsToken,
          label: "Destination token",
          tokenAddress: destination.tokenAddress,
        }),
      ]);

      return { destination: destinationToken, source: sourceToken };
    },
    retry: 1,
    staleTime: 15_000,
  });

  const status = useMemo<BridgeTokenAccountStatus>(() => {
    if (!enabled || !account) return "idle";
    if (tokenQuery.isLoading || tokenQuery.isFetching) return "checking";
    if (tokenQuery.isError) return "failed";
    return "ready";
  }, [account, enabled, tokenQuery.isError, tokenQuery.isFetching, tokenQuery.isLoading]);

  const invalidate = useCallback(() => queryClient.invalidateQueries({ queryKey }), [queryClient, queryKey]);

  return {
    destinationToken: tokenQuery.data?.destination,
    invalidate,
    showHtsAssociationNotice,
    sourceToken: tokenQuery.data?.source,
    status,
  };
};
