"use client";

import { SubscriptionCard, SubscriptionCardSkeleton } from "~~/components/marketplace";
import { useScaffoldReadContract } from "~~/hooks/scaffold-hbar";

interface SubscriptionCardWithDataProps {
  serialNumber: bigint;
  onCreateListing: (serialNumber: bigint) => void;
}

export const SubscriptionCardWithData = ({ serialNumber, onCreateListing }: SubscriptionCardWithDataProps) => {
  const { data: subscriptionData, isLoading } = useScaffoldReadContract({
    contractName: "SubscriptionNFT",
    functionName: "getSubscription",
    args: [serialNumber],
  });

  const { data: isExpired } = useScaffoldReadContract({
    contractName: "SubscriptionNFT",
    functionName: "isExpired",
    args: [serialNumber],
  });

  const { data: currentOwner } = useScaffoldReadContract({
    contractName: "SubscriptionNFT",
    functionName: "currentOwner",
    args: [serialNumber],
  });

  if (isLoading || !subscriptionData) {
    return <SubscriptionCardSkeleton count={1} />;
  }

  const data = subscriptionData as any;

  // Try to access by property name first, fallback to index
  const minter = data.minter ?? data[0] ?? "";
  const provider = data.provider ?? data[1] ?? "Unknown";
  const serviceTier = data.serviceTier ?? data[2] ?? "Unknown";
  const startDate = data.startDate ?? data[3] ?? 0n;
  const endDate = data.endDate ?? data[4] ?? 0n;

  const subscription = {
    serialNumber,
    provider: String(provider),
    serviceTier: String(serviceTier),
    startDate: BigInt(startDate),
    endDate: BigInt(endDate),
    minter: String(minter),
    owner: currentOwner ? String(currentOwner) : undefined,
    isExpired: Boolean(isExpired),
  };

  return <SubscriptionCard subscription={subscription} showActions={true} onCreateListing={onCreateListing} />;
};
