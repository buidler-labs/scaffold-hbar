"use client";

import { useCallback, useState } from "react";
import { ccipRouterAbi } from "./ccipAbi";
import { buildCcipMessage, getCcipNativeFeeValue } from "./ccipMessage";
import type { BridgeRoute } from "./types";
import type { CcipQuote } from "./useCcipQuote";
import type { Address, Hash } from "viem";
import { usePublicClient, useWriteContract } from "wagmi";
import { notification } from "~~/utils/scaffold-hbar";

export type CcipSendStatus = "idle" | "sending" | "submitted" | "failed";

type UseCcipSendArgs = {
  enabled: boolean;
  quote: CcipQuote;
  recipient?: Address;
  route: BridgeRoute;
  sender?: Address;
};

const getSendErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.includes("TOKEN_NOT_ASSOCIATED_TO_ACCOUNT")) {
    return "Make sure this wallet is associated with the Hedera HTS token before bridging.";
  }

  return error instanceof Error ? error.message : "Unable to submit CCIP transfer.";
};

export const useCcipSend = ({ enabled, quote, recipient, route, sender }: UseCcipSendArgs) => {
  const sourceClient = usePublicClient({ chainId: route.sourceChainId });
  const { writeContractAsync } = useWriteContract();
  const [status, setStatus] = useState<CcipSendStatus>("idle");
  const [submittedHash, setSubmittedHash] = useState<Hash | undefined>();

  const reset = useCallback(() => {
    setStatus("idle");
    setSubmittedHash(undefined);
  }, []);

  const sendCcip = useCallback(async () => {
    if (
      !enabled ||
      !route.ccip ||
      quote.status !== "quoted" ||
      quote.amountInBaseUnits === undefined ||
      quote.nativeFee === undefined ||
      !recipient ||
      !sender ||
      !sourceClient
    ) {
      return undefined;
    }

    const message = buildCcipMessage({
      amountInBaseUnits: quote.amountInBaseUnits,
      recipient,
      route,
    });
    if (!message) return undefined;

    let notificationId: string | undefined;
    setStatus("sending");

    try {
      notificationId = notification.loading("CCIP send: waiting for wallet confirmation.");
      const hash = await writeContractAsync({
        address: route.ccip.sourceRouterAddress,
        abi: ccipRouterAbi,
        functionName: "ccipSend",
        args: [BigInt(route.ccip.destinationChainSelector), message],
        chainId: route.sourceChainId,
        value: getCcipNativeFeeValue(route, quote.nativeFee),
      });

      notification.remove(notificationId);
      notificationId = notification.loading("CCIP send: waiting for source transaction confirmation.");

      await sourceClient.waitForTransactionReceipt({ hash });
      notification.remove(notificationId);
      notification.success("CCIP transfer submitted.");
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
    sendCcip,
    status,
    submittedHash,
  };
};
