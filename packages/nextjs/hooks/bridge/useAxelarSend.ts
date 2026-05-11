"use client";

import { useCallback, useState } from "react";
import type { AxelarQuote } from "./useAxelarQuote";
import type { Address, Hash } from "viem";
import { usePublicClient, useWriteContract } from "wagmi";
import type { BridgeRoute, BridgeSendStatus } from "~~/services/bridge";
import { axelarInterchainTokenServiceAbi } from "~~/services/bridge/axelarAbi";
import { notification } from "~~/utils/scaffold-hbar";

export type AxelarSendStatus = BridgeSendStatus;

type UseAxelarSendArgs = {
  enabled: boolean;
  quote: AxelarQuote;
  recipient?: Address;
  route: BridgeRoute;
  sender?: Address;
};

const getSendErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.includes("TOKEN_NOT_ASSOCIATED_TO_ACCOUNT")) {
    return "Make sure this wallet is associated with the Hedera HTS token before bridging.";
  }

  return error instanceof Error ? error.message : "Unable to submit Axelar transfer.";
};

export const useAxelarSend = ({ enabled, quote, recipient, route, sender }: UseAxelarSendArgs) => {
  const sourceClient = usePublicClient({ chainId: route.sourceChainId });
  const { writeContractAsync } = useWriteContract();
  const [status, setStatus] = useState<AxelarSendStatus>("idle");
  const [submittedHash, setSubmittedHash] = useState<Hash | undefined>();

  const reset = useCallback(() => {
    setStatus("idle");
    setSubmittedHash(undefined);
  }, []);

  const sendAxelar = useCallback(async () => {
    if (
      !enabled ||
      !route.axelar ||
      quote.status !== "quoted" ||
      quote.amountInBaseUnits === undefined ||
      quote.nativeFee === undefined ||
      quote.gasValue === undefined ||
      !recipient ||
      !sender ||
      !sourceClient
    ) {
      return undefined;
    }

    let notificationId: string | undefined;
    setStatus("sending");

    try {
      notificationId = notification.loading("Axelar send: waiting for wallet confirmation.");
      const hash = await writeContractAsync({
        address: route.axelar.interchainTokenServiceAddress,
        abi: axelarInterchainTokenServiceAbi,
        functionName: "interchainTransfer",
        args: [
          route.axelar.tokenId,
          route.axelar.destinationAxelarName,
          recipient,
          quote.amountInBaseUnits,
          "0x",
          quote.gasValue,
        ],
        chainId: route.sourceChainId,
        gas: quote.gasLimit,
        value: quote.nativeFee,
      });

      notification.remove(notificationId);
      notificationId = notification.loading("Axelar send: waiting for source transaction confirmation.");

      await sourceClient.waitForTransactionReceipt({ hash });
      notification.remove(notificationId);
      notification.success("Axelar transfer submitted.");
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
    isSending: status === "sending",
    reset,
    sendAxelar,
    status,
    submittedHash,
  };
};
