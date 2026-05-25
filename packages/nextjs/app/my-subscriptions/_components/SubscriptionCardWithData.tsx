"use client";

import { SubscriptionCard, SubscriptionCardSkeleton } from "~~/components/marketplace";
import { useScaffoldReadContract } from "~~/hooks/scaffold-hbar";
import { parseSubscription } from "~~/utils/hedera";

interface SubscriptionCardWithDataProps {
  serialNumber: bigint;
  onCreateListing: (serialNumber: bigint) => void;
  onListForSale: (serialNumber: bigint) => void;
}

export const SubscriptionCardWithData = ({
  serialNumber,
  onCreateListing,
  onListForSale,
}: SubscriptionCardWithDataProps) => {
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

  // Check if NFT has an active sale listing
  const { data: hasActiveSaleListing } = useScaffoldReadContract({
    contractName: "SubscriptionSalesMarketplace",
    functionName: "hasActiveListing",
    args: [serialNumber],
    query: { enabled: !!serialNumber },
  });

  // Get the active listing details to determine if it's auction or fixed price
  const { data: activeListingId } = useScaffoldReadContract({
    contractName: "SubscriptionSalesMarketplace",
    functionName: "activeListingBySerial",
    args: [serialNumber],
    query: { enabled: !!serialNumber && hasActiveSaleListing === true },
  });

  const { data: listingData } = useScaffoldReadContract({
    contractName: "SubscriptionSalesMarketplace",
    functionName: "getListing",
    args: [activeListingId!],
    query: { enabled: !!activeListingId && activeListingId > 0n },
  });

  const parsed = parseSubscription(subscriptionData);

  if (isLoading || !parsed) {
    return <SubscriptionCardSkeleton count={1} />;
  }

  // Determine listing status
  const isListedForSale = hasActiveSaleListing === true;
  const isAuction = listingData ? Number(listingData.listingType) === 1 : false;
  const listingStatus = isListedForSale ? (isAuction ? "auction" : "sale") : undefined;

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

  return (
    <SubscriptionCard
      subscription={subscription}
      showActions={true}
      onCreateListing={onCreateListing}
      onListForSale={onListForSale}
      listingStatus={listingStatus}
    />
  );
};
