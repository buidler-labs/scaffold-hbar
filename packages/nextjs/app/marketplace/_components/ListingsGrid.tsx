"use client";

import { useMemo, useState } from "react";
import { AvailabilityCardWithData } from "./AvailabilityCardWithData";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { AvailabilityCardSkeleton } from "~~/components/marketplace";
import { useScaffoldEventHistory } from "~~/hooks/scaffold-hbar";

const ITEMS_PER_PAGE = 6;

interface ListingData {
  id: bigint;
  serialNumber: bigint;
  owner: string;
  windowStart: bigint;
  windowEnd: bigint;
  pricePerDay: bigint;
}

export const ListingsGrid = () => {
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  const {
    data: availabilityEvents,
    isLoading: isLoadingEvents,
    refetch,
  } = useScaffoldEventHistory({
    contractName: "SubscriptionMarketplace",
    eventName: "AvailabilityCreated",
    watch: false,
  });

  // Sorted by availability ID descending (newest first)
  const listings = useMemo(() => {
    if (!availabilityEvents || availabilityEvents.length === 0) {
      return [];
    }

    return availabilityEvents
      .filter(event => event.args)
      .map(event => ({
        id: event.args.availabilityId as bigint,
        serialNumber: event.args.serialNumber as bigint,
        owner: event.args.owner as string,
        windowStart: event.args.windowStart as bigint,
        windowEnd: event.args.windowEnd as bigint,
        pricePerDay: event.args.pricePerDay as bigint,
      }))
      .sort((a, b) => (b.id > a.id ? 1 : b.id < a.id ? -1 : 0)) as ListingData[];
  }, [availabilityEvents]);

  const visibleListings = listings.slice(0, visibleCount);
  const hasMore = visibleCount < listings.length;
  const remainingCount = listings.length - visibleCount;

  const handleRefresh = () => {
    setVisibleCount(ITEMS_PER_PAGE);
    refetch();
  };

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + ITEMS_PER_PAGE);
  };

  if (isLoadingEvents) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AvailabilityCardSkeleton count={6} />
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📭</div>
        <h3 className="text-xl font-semibold mb-2">No Listings Yet</h3>
        <p className="text-base-content/60">Be the first to list your subscription NFT on the marketplace!</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-base-content/60">
          Showing {visibleListings.length} of {listings.length} listings
        </p>
        <button onClick={handleRefresh} className="btn btn-outline btn-sm">
          <ArrowPathIcon className="h-4 w-4" />
          Refresh
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleListings.map(listing => (
          <AvailabilityCardWithData
            key={listing.id.toString()}
            availabilityId={listing.id}
            serialNumber={listing.serialNumber}
            owner={listing.owner}
            windowStart={listing.windowStart}
            windowEnd={listing.windowEnd}
            pricePerDay={listing.pricePerDay}
          />
        ))}
      </div>
      {hasMore && (
        <div className="flex justify-center gap-4 mt-8">
          <button onClick={handleLoadMore} className="btn btn-primary">
            Load More ({remainingCount} remaining)
          </button>
        </div>
      )}
    </div>
  );
};
