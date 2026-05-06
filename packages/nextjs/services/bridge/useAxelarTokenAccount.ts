"use client";

import { HEDERA_TESTNET_CHAIN_ID } from "./constants";
import type { BridgeRoute } from "./types";
import type { BridgeTokenAccountStatus, BridgeTokenBalance } from "./useBridgeTokenAccount";
import { useBridgeTokenAccount } from "./useBridgeTokenAccount";
import type { Address } from "viem";

export type AxelarTokenAccountStatus = BridgeTokenAccountStatus;
export type AxelarTokenBalance = BridgeTokenBalance;

type UseAxelarTokenAccountArgs = {
  account?: Address;
  enabled: boolean;
  route: BridgeRoute;
};

export const useAxelarTokenAccount = ({ account, enabled, route }: UseAxelarTokenAccountArgs) => {
  const sourceIsHtsToken = route.sourceChainId === HEDERA_TESTNET_CHAIN_ID;
  const destinationIsHtsToken = route.destinationChainId === HEDERA_TESTNET_CHAIN_ID;

  return useBridgeTokenAccount({
    account,
    destination: {
      chainId: route.destinationChainId,
      isHtsToken: destinationIsHtsToken,
      tokenAddress: route.axelar?.destinationTokenAddress,
    },
    enabled: enabled && route.providerId === "axelar" && Boolean(route.axelar),
    queryKey: [
      "axelarTokenAccount",
      account,
      route.direction,
      route.sourceChainId,
      route.destinationChainId,
      route.axelar?.sourceTokenAddress,
      route.axelar?.destinationTokenAddress,
    ],
    showHtsAssociationNotice: Boolean(
      route.axelar &&
      (route.sourceChainId === HEDERA_TESTNET_CHAIN_ID || route.destinationChainId === HEDERA_TESTNET_CHAIN_ID),
    ),
    source: {
      chainId: route.sourceChainId,
      isHtsToken: sourceIsHtsToken,
      tokenAddress: route.axelar?.sourceTokenAddress,
    },
  });
};
