"use client";

import { useCallback, useMemo, useState } from "react";
import { layerZeroOftAbi } from "./layerzeroAbi";
import {
  LAYERZERO_DEFAULT_MIN_AMOUNT_BPS,
  LAYERZERO_DEFAULT_RECEIVE_GAS,
  buildLayerZeroSendParam,
  getLayerZeroNativeFeeValue,
} from "./layerzeroMessage";
import type { BridgeRoute, BridgeSendStatus } from "./types";
import type { LayerZeroQuote } from "./useLayerZeroQuote";
import type { Address, Hash } from "viem";
import { usePublicClient, useWriteContract } from "wagmi";
import { notification } from "~~/utils/scaffold-hbar";

export type LayerZeroSendStatus = BridgeSendStatus;

type UseLayerZeroSendArgs = {
  enabled: boolean;
  quote: LayerZeroQuote;
  recipient?: Address;
  route: BridgeRoute;
  sender?: Address;
};

const getSendErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.includes("TOKEN_NOT_ASSOCIATED_TO_ACCOUNT")) {
    return "Make sure this wallet is associated with the Hedera HTS token before bridging.";
  }

  return error instanceof Error ? error.message : "Unable to submit LayerZero transfer.";
};

const formatLayerZeroRelayCommand = (route: BridgeRoute, txHash: Hash | undefined) => {
  if (!route.layerzero || !txHash) return undefined;

  return route.layerzero.relayCommand.replace("{direction}", route.direction).replace("{txHash}", txHash);
};

export const useLayerZeroSend = ({ enabled, quote, recipient, route, sender }: UseLayerZeroSendArgs) => {
  const sourceClient = usePublicClient({ chainId: route.sourceChainId });
  const { writeContractAsync } = useWriteContract();
  const [status, setStatus] = useState<LayerZeroSendStatus>("idle");
  const [submittedHash, setSubmittedHash] = useState<Hash | undefined>();

  const reset = useCallback(() => {
    setStatus("idle");
    setSubmittedHash(undefined);
  }, []);

  const followUpCommand = useMemo(() => formatLayerZeroRelayCommand(route, submittedHash), [route, submittedHash]);

  const sendLayerZero = useCallback(async () => {
    if (
      !enabled ||
      !route.layerzero ||
      quote.status !== "quoted" ||
      quote.amountInBaseUnits === undefined ||
      !recipient ||
      !sender ||
      !sourceClient
    ) {
      return undefined;
    }

    const sendParam = buildLayerZeroSendParam({
      amountInBaseUnits: quote.amountInBaseUnits,
      minAmountBps: BigInt(route.layerzero.minAmountBps || LAYERZERO_DEFAULT_MIN_AMOUNT_BPS),
      receiveGas: BigInt(route.layerzero.receiveGas || LAYERZERO_DEFAULT_RECEIVE_GAS),
      recipient,
      route,
    });
    if (!sendParam) return undefined;

    let notificationId: string | undefined;
    setStatus("sending");

    try {
      const freshFee = await sourceClient.readContract({
        address: route.layerzero.sourceOftAddress,
        abi: layerZeroOftAbi,
        functionName: "quoteSend",
        args: [sendParam, false],
      });
      const nativeFeeValue = getLayerZeroNativeFeeValue(route, freshFee.nativeFee);

      notificationId = notification.loading("LayerZero send: waiting for wallet confirmation.");
      const hash = await writeContractAsync({
        address: route.layerzero.sourceOftAddress,
        abi: layerZeroOftAbi,
        functionName: "send",
        args: [sendParam, { nativeFee: nativeFeeValue, lzTokenFee: freshFee.lzTokenFee }, sender],
        chainId: route.sourceChainId,
        gas: route.layerzero.sourceGasLimit ? BigInt(route.layerzero.sourceGasLimit) : undefined,
        value: nativeFeeValue,
      });

      notification.remove(notificationId);
      notificationId = notification.loading("LayerZero send: waiting for source transaction confirmation.");

      await sourceClient.waitForTransactionReceipt({ hash });
      notification.remove(notificationId);
      notification.success("LayerZero transfer submitted. Run the relay command to complete delivery.");
      setSubmittedHash(hash);
      setStatus("submitted");

      return hash;
    } catch (error) {
      if (notificationId) notification.remove(notificationId);
      notification.error(getSendErrorMessage(error));
      setStatus("failed");
      throw error;
    }
  }, [enabled, quote, recipient, route, sender, sourceClient, writeContractAsync]);

  return {
    followUpCommand,
    isSending: status === "sending",
    reset,
    sendLayerZero,
    status,
    submittedHash,
  };
};
