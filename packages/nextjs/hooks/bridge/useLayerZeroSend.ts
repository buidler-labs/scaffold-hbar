"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { LayerZeroQuote } from "./useLayerZeroQuote";
import type { Address, Hash } from "viem";
import { usePublicClient, useWriteContract } from "wagmi";
import type { BridgeRoute, BridgeSendStatus } from "~~/services/bridge";
import { layerZeroOftAbi } from "~~/services/bridge/layerzeroAbi";
import {
  LAYERZERO_DEFAULT_MIN_AMOUNT_BPS,
  LAYERZERO_DEFAULT_RECEIVE_GAS,
  buildLayerZeroSendParam,
  getLayerZeroNativeFeeValue,
} from "~~/services/bridge/layerzeroMessage";
import { notification } from "~~/utils/scaffold-hbar";

export type LayerZeroSendStatus = BridgeSendStatus;

type UseLayerZeroSendArgs = {
  enabled: boolean;
  onRelayDelivered?: () => Promise<unknown>;
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

const getRelayErrorMessage = async (response: Response) => {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? "LayerZero automatic relay failed.";
  } catch {
    return "LayerZero automatic relay failed.";
  }
};

export const useLayerZeroSend = ({
  enabled,
  onRelayDelivered,
  quote,
  recipient,
  route,
  sender,
}: UseLayerZeroSendArgs) => {
  const sourceClient = usePublicClient({ chainId: route.sourceChainId });
  const { writeContractAsync } = useWriteContract();
  const [status, setStatus] = useState<LayerZeroSendStatus>("idle");
  const [relayError, setRelayError] = useState<string | undefined>();
  const [submittedHash, setSubmittedHash] = useState<Hash | undefined>();
  const activeOperationIdRef = useRef(0);
  const relayAbortControllerRef = useRef<AbortController | undefined>(undefined);

  const reset = useCallback(() => {
    activeOperationIdRef.current += 1;
    relayAbortControllerRef.current?.abort();
    relayAbortControllerRef.current = undefined;
    setStatus("idle");
    setRelayError(undefined);
    setSubmittedHash(undefined);
  }, []);

  const followUpCommand = useMemo(() => formatLayerZeroRelayCommand(route, submittedHash), [route, submittedHash]);

  const relayLayerZeroTransfer = useCallback(
    async (hash: Hash, operationId: number) => {
      let notificationId: string | undefined;
      const abortController = new AbortController();
      relayAbortControllerRef.current = abortController;
      const isActiveOperation = () => activeOperationIdRef.current === operationId;

      try {
        if (!isActiveOperation()) return;

        setStatus("relaying");
        setRelayError(undefined);
        notificationId = notification.loading("LayerZero relay: delivering transfer.");

        const response = await fetch("/api/bridge/layerzero/relay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abortController.signal,
          body: JSON.stringify({
            direction: route.direction,
            txHash: hash,
          }),
        });

        if (!isActiveOperation()) return;

        if (!response.ok) {
          throw new Error(await getRelayErrorMessage(response));
        }

        await onRelayDelivered?.();
        if (!isActiveOperation()) return;

        notification.remove(notificationId);
        notification.success("LayerZero transfer delivered.");
        setStatus("delivered");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "LayerZero automatic relay failed.";
        if (notificationId) notification.remove(notificationId);
        if (!isActiveOperation()) return;
        notification.error(errorMessage);
        setRelayError(errorMessage);
        setStatus("relay_failed");
      } finally {
        if (relayAbortControllerRef.current === abortController) {
          relayAbortControllerRef.current = undefined;
        }
      }
    },
    [onRelayDelivered, route.direction],
  );

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

    relayAbortControllerRef.current?.abort();
    const operationId = activeOperationIdRef.current + 1;
    activeOperationIdRef.current = operationId;

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
      setRelayError(undefined);
      const freshFee = await sourceClient.readContract({
        address: route.layerzero.sourceOftAddress,
        abi: layerZeroOftAbi,
        functionName: "quoteSend",
        args: [sendParam, false],
      });
      const nativeFeeValue = getLayerZeroNativeFeeValue(route, freshFee.nativeFee);

      if (activeOperationIdRef.current !== operationId) return undefined;

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
      if (activeOperationIdRef.current !== operationId) return hash;

      notificationId = notification.loading("LayerZero send: waiting for source transaction confirmation.");

      await sourceClient.waitForTransactionReceipt({ hash });
      notification.remove(notificationId);
      if (activeOperationIdRef.current !== operationId) return hash;

      notification.success("LayerZero source transaction confirmed.");
      setSubmittedHash(hash);
      setStatus("relaying");
      void relayLayerZeroTransfer(hash, operationId);

      return hash;
    } catch (error) {
      if (notificationId) notification.remove(notificationId);
      if (activeOperationIdRef.current !== operationId) return undefined;
      notification.error(getSendErrorMessage(error));
      setStatus("failed");
      throw error;
    }
  }, [enabled, quote, recipient, relayLayerZeroTransfer, route, sender, sourceClient, writeContractAsync]);

  return {
    followUpCommand,
    isSending: status === "sending" || status === "relaying",
    relayError,
    reset,
    sendLayerZero,
    status,
    submittedHash,
  };
};
