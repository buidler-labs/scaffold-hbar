"use client";

import { useMemo } from "react";
import { SalesListingCard, SalesListingCardSkeleton, SalesListingData } from "./SalesListingCard";
import { useScaffoldReadContract } from "~~/hooks/scaffold-hbar";

interface SalesListingCardWithDataProps {
  listingId: bigint;
  serialNumber: bigint;
  seller: string;
  isAuction: boolean;
  eventPrice: bigint;
  eventEffectiveStartDate?: bigint;
  eventAuctionEndTime?: bigint;
}

export const SalesListingCardWithData = ({
  listingId,
  serialNumber,
  seller,
  isAuction,
  eventPrice,
  eventEffectiveStartDate,
  eventAuctionEndTime,
}: SalesListingCardWithDataProps) => {
  const { data: listingData, isLoading: isLoadingListing } = useScaffoldReadContract({
    contractName: "SubscriptionSalesMarketplace",
    functionName: "getListing",
    args: [listingId],
  });

  const { data: subscriptionData, isLoading: isLoadingSubscription } = useScaffoldReadContract({
    contractName: "SubscriptionNFT",
    functionName: "getSubscription",
    args: [serialNumber],
  });

  const listing: SalesListingData | null = useMemo(() => {
    if (listingData) {
      return {
        id: listingData.id,
        serialNumber: listingData.serialNumber,
        seller: listingData.seller,
        listingType: Number(listingData.listingType),
        status: Number(listingData.status),
        price: listingData.price,
        effectiveStartDate: listingData.effectiveStartDate,
        auctionEndTime: listingData.auctionEndTime,
        highestBidder: listingData.highestBidder,
        highestBid: listingData.highestBid,
        subscriptionProvider: subscriptionData?.provider,
        subscriptionTier: subscriptionData?.serviceTier,
        subscriptionEndDate: subscriptionData?.endDate,
      };
    }

    return {
      id: listingId,
      serialNumber: serialNumber,
      seller: seller,
      listingType: isAuction ? 1 : 0,
      status: 0,
      price: eventPrice,
      effectiveStartDate: eventEffectiveStartDate ?? 0n,
      auctionEndTime: eventAuctionEndTime ?? 0n,
      highestBidder: "0x0000000000000000000000000000000000000000",
      highestBid: 0n,
      subscriptionProvider: subscriptionData?.provider,
      subscriptionTier: subscriptionData?.serviceTier,
      subscriptionEndDate: subscriptionData?.endDate,
    };
  }, [
    listingData,
    listingId,
    serialNumber,
    seller,
    isAuction,
    eventPrice,
    eventEffectiveStartDate,
    eventAuctionEndTime,
    subscriptionData,
  ]);

  if (isLoadingListing || isLoadingSubscription) {
    return <SalesListingCardSkeleton />;
  }

  if (!listing) {
    return null;
  }

  return <SalesListingCard listing={listing} />;
};
