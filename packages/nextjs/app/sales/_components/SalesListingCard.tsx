"use client";

import Link from "next/link";
import { ClockIcon, CurrencyDollarIcon, TagIcon, UserIcon } from "@heroicons/react/24/outline";
import { AddressDisplay, DateRangeDisplay, HbarAmount } from "~~/components/marketplace";

export enum ListingType {
  FixedPrice = 0,
  Auction = 1,
}

export enum ListingStatus {
  Active = 0,
  Sold = 1,
  Cancelled = 2,
}

export interface SalesListingData {
  id: bigint;
  serialNumber: bigint;
  seller: string;
  listingType: number;
  status: number;
  price: bigint;
  effectiveStartDate: bigint;
  auctionEndTime: bigint;
  highestBidder: string;
  highestBid: bigint;
  subscriptionProvider?: string;
  subscriptionTier?: string;
  subscriptionEndDate?: bigint;
}

interface SalesListingCardProps {
  listing: SalesListingData;
}

const formatTimeRemaining = (endTime: bigint): string => {
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (endTime <= now) return "Ended";

  const remaining = Number(endTime - now);
  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

export const SalesListingCard = ({ listing }: SalesListingCardProps) => {
  const {
    id,
    serialNumber,
    seller,
    listingType,
    status,
    price,
    effectiveStartDate,
    auctionEndTime,
    highestBidder,
    highestBid,
    subscriptionProvider,
    subscriptionTier,
    subscriptionEndDate,
  } = listing;

  const isActive = status === ListingStatus.Active;
  const isAuction = listingType === ListingType.Auction;
  const hasNoBids = highestBidder === "0x0000000000000000000000000000000000000000";
  const currentPrice = isAuction && !hasNoBids ? highestBid : price;

  const now = BigInt(Math.floor(Date.now() / 1000));
  const auctionEnded = isAuction && auctionEndTime <= now;

  const getStatusBadge = () => {
    if (status === ListingStatus.Sold) return <span className="badge badge-success badge-sm">Sold</span>;
    if (status === ListingStatus.Cancelled) return <span className="badge badge-error badge-sm">Cancelled</span>;
    if (isAuction && auctionEnded) return <span className="badge badge-warning badge-sm">Ended</span>;
    if (isAuction) return <span className="badge badge-info badge-sm">Auction</span>;
    return <span className="badge badge-outline badge-sm">For Sale</span>;
  };

  return (
    <div
      className={`card bg-base-100 border border-base-300 shadow-md hover:shadow-xl transition-all rounded-xl ${!isActive ? "opacity-60" : ""}`}
    >
      <div className="card-body p-4">
        <div className="flex items-start justify-between">
          <div>
            {subscriptionProvider ? (
              <>
                <h3 className="card-title text-lg">{subscriptionProvider}</h3>
                {subscriptionTier && <p className="text-sm text-base-content/70">{subscriptionTier}</p>}
              </>
            ) : (
              <span className="text-sm text-base-content/60">NFT #{serialNumber.toString()}</span>
            )}
          </div>
          {getStatusBadge()}
        </div>

        <div className="divider my-2"></div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <TagIcon className="h-4 w-4 text-base-content/60" />
            <span className="text-xs text-base-content/60">
              {isAuction ? (hasNoBids ? "Reserve:" : "Current Bid:") : "Price:"}
            </span>
            <HbarAmount tinybars={currentPrice} className="font-semibold" />
          </div>

          {isAuction && isActive && (
            <div className="flex items-center gap-2">
              <ClockIcon className="h-4 w-4 text-base-content/60" />
              <span className="text-xs">
                {auctionEnded ? "Auction ended" : `Ends in ${formatTimeRemaining(auctionEndTime)}`}
              </span>
            </div>
          )}

          {(effectiveStartDate || subscriptionEndDate) && (
            <div className="flex items-center gap-2">
              <CurrencyDollarIcon className="h-4 w-4 text-base-content/60" />
              <span className="text-xs text-base-content/60">Valid:</span>
              <DateRangeDisplay start={effectiveStartDate || 0n} end={subscriptionEndDate || 0n} />
            </div>
          )}

          <div className="flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-base-content/60" />
            <span className="text-xs">Seller:</span>
            <AddressDisplay address={seller} size="sm" />
          </div>

          {isAuction && !hasNoBids && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-base-content/60">High Bidder:</span>
              <AddressDisplay address={highestBidder} size="sm" />
            </div>
          )}
        </div>

        {isActive && (
          <div className="card-actions justify-end mt-4">
            <Link href={`/sales/${id.toString()}`} className="btn btn-primary btn-sm">
              {isAuction ? "Place Bid" : "Buy Now"}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export const SalesListingCardSkeleton = ({ count = 1 }: { count?: number }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card bg-base-100 border border-base-300 shadow-md rounded-xl animate-pulse">
          <div className="card-body p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="h-6 w-32 bg-base-300 rounded"></div>
                <div className="h-4 w-24 bg-base-300 rounded mt-1"></div>
              </div>
              <div className="h-5 w-16 bg-base-300 rounded"></div>
            </div>
            <div className="divider my-2"></div>
            <div className="space-y-2">
              <div className="h-4 w-full bg-base-300 rounded"></div>
              <div className="h-4 w-3/4 bg-base-300 rounded"></div>
              <div className="h-4 w-1/2 bg-base-300 rounded"></div>
            </div>
            <div className="flex justify-end mt-4">
              <div className="h-8 w-24 bg-base-300 rounded"></div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
};
