"use client";

import { useBridgeTokenAccount } from "./useBridgeTokenAccount";
import type { Address } from "viem";
import type { BridgeRoute } from "~~/services/bridge";
import type { BridgeTokenAccountStatus, BridgeTokenBalance } from "~~/services/bridge";
import { HEDERA_TESTNET_CHAIN_ID } from "~~/services/bridge/constants";

export type LayerZeroTokenAccountStatus = BridgeTokenAccountStatus;
export type LayerZeroTokenBalance = BridgeTokenBalance;

type UseLayerZeroTokenAccountArgs = {
  account?: Address;
  enabled: boolean;
  route: BridgeRoute;
};

export const useLayerZeroTokenAccount = ({ account, enabled, route }: UseLayerZeroTokenAccountArgs) => {
  const sourceIsHtsToken =
    route.sourceChainId === HEDERA_TESTNET_CHAIN_ID && Boolean(route.layerzero?.sourceHtsTokenAddress);
  const destinationIsHtsToken =
    route.destinationChainId === HEDERA_TESTNET_CHAIN_ID && Boolean(route.layerzero?.destinationHtsTokenAddress);

  return useBridgeTokenAccount({
    account,
    destination: {
      chainId: route.destinationChainId,
      isHtsToken: destinationIsHtsToken,
      tokenAddress: route.layerzero?.destinationTokenAddress,
    },
    enabled: enabled && route.providerId === "layerzero" && Boolean(route.layerzero),
    queryKey: [
      "layerZeroTokenAccount",
      account,
      route.direction,
      route.sourceChainId,
      route.destinationChainId,
      route.layerzero?.sourceTokenAddress,
      route.layerzero?.destinationTokenAddress,
    ],
    showHtsAssociationNotice: Boolean(
      route.layerzero && (route.layerzero.sourceHtsTokenAddress || route.layerzero.destinationHtsTokenAddress),
    ),
    source: {
      chainId: route.sourceChainId,
      isHtsToken: sourceIsHtsToken,
      tokenAddress: route.layerzero?.sourceTokenAddress,
    },
  });
};
