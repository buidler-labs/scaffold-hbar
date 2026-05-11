"use client";

import { useBridgeTokenAccount } from "./useBridgeTokenAccount";
import type { Address } from "viem";
import type { BridgeRoute } from "~~/services/bridge";
import type { BridgeTokenAccountStatus, BridgeTokenBalance } from "~~/services/bridge";
import { HEDERA_TESTNET_CHAIN_ID } from "~~/services/bridge/constants";

export type CcipTokenAccountStatus = BridgeTokenAccountStatus;
export type CcipTokenBalance = BridgeTokenBalance;

type UseCcipTokenAccountArgs = {
  account?: Address;
  enabled: boolean;
  route: BridgeRoute;
};

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

export const useCcipTokenAccount = ({ account, enabled, route }: UseCcipTokenAccountArgs) => {
  const sourceTokenAddress = getDisplayTokenAddress(route, "source");
  const destinationTokenAddress = getDisplayTokenAddress(route, "destination");
  const sourceIsHtsToken =
    route.sourceChainId === HEDERA_TESTNET_CHAIN_ID && Boolean(route.ccip?.sourceHtsTokenAddress);
  const destinationIsHtsToken =
    route.destinationChainId === HEDERA_TESTNET_CHAIN_ID && Boolean(route.ccip?.destinationHtsTokenAddress);

  const showHtsAssociationNotice = Boolean(
    route.ccip &&
    ((route.sourceChainId === HEDERA_TESTNET_CHAIN_ID && route.ccip.sourceHtsTokenAddress) ||
      (route.destinationChainId === HEDERA_TESTNET_CHAIN_ID && route.ccip.destinationHtsTokenAddress)),
  );

  return useBridgeTokenAccount({
    account,
    destination: {
      chainId: route.destinationChainId,
      isHtsToken: destinationIsHtsToken,
      tokenAddress: destinationTokenAddress,
    },
    enabled: enabled && route.providerId === "ccip" && Boolean(route.ccip),
    queryKey: [
      "ccipTokenAccount",
      account,
      route.direction,
      route.sourceChainId,
      route.destinationChainId,
      sourceTokenAddress,
      destinationTokenAddress,
    ],
    showHtsAssociationNotice,
    source: {
      chainId: route.sourceChainId,
      isHtsToken: sourceIsHtsToken,
      tokenAddress: sourceTokenAddress,
    },
  });
};
