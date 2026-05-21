"use client";

import { SubscriptionCard, SubscriptionCardSkeleton } from "~~/components/marketplace";
import { useScaffoldReadContract } from "~~/hooks/scaffold-hbar";
import { parseSubscription } from "~~/utils/hedera";

interface SubscriptionCardWithDataProps {
  serialNumber: bigint;
  onCreateListing: (serialNumber: bigint) => void;
}

export const SubscriptionCardWithData = ({ serialNumber, onCreateListing }: SubscriptionCardWithDataProps) => {
  const { data: subscriptionData, isLoading } = useScaffoldReadContract({
    contractName: "SubscriptionNFT",
    functionName: "getSubscription",
    args: [serialNumber],
    query: { enabled: !!serialNumber },
  });

  const { data: isExpired } = useScaffoldReadContract({
    contractName: "SubscriptionNFT",
    functionName: "isExpired",
    args: [serialNumber],
    query: { enabled: !!serialNumber },
  });

  const { data: currentOwner } = useScaffoldReadContract({
    contractName: "SubscriptionNFT",
    functionName: "currentOwner",
    args: [serialNumber],
    query: { enabled: !!serialNumber },
  });

  const parsed = parseSubscription(subscriptionData);

  if (isLoading || !parsed) {
    return <SubscriptionCardSkeleton count={1} />;
  }

  const subscription = {
    serialNumber,
    provider: parsed.provider,
    serviceTier: parsed.serviceTier,
    startDate: parsed.startDate,
    endDate: parsed.endDate,
    minter: parsed.minter,
    owner: currentOwner ? String(currentOwner) : undefined,
    isExpired: Boolean(isExpired),
  };

  return <SubscriptionCard subscription={subscription} showActions={true} onCreateListing={onCreateListing} />;
};
