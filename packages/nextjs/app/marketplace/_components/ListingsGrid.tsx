"use client";

import { useCallback, useMemo } from "react";
import { AvailabilityCardWithData } from "./AvailabilityCardWithData";
import { AvailabilityCardSkeleton, ListHeader, LoadMoreButton, NoListingsState } from "~~/components/marketplace";
import { usePagination } from "~~/hooks/marketplace";
import { useScaffoldEventHistory } from "~~/hooks/scaffold-hbar";

interface ListingData {
  id: bigint;
  serialNumber: bigint;
  owner: string;
  windowStart: bigint;
  windowEnd: bigint;
  pricePerDay: bigint;
}

export const ListingsGrid = () => {
  const {
    data: availabilityEvents,
    isLoading: isLoadingCreated,
    isFetching: isFetchingCreated,
    refetch: refetchCreated,
  } = useScaffoldEventHistory({
    contractName: "SubscriptionMarketplace",
    eventName: "AvailabilityCreated",
    watch: false,
  });

  const {
    data: removedEvents,
    isLoading: isLoadingRemoved,
    isFetching: isFetchingRemoved,
    refetch: refetchRemoved,
  } = useScaffoldEventHistory({
    contractName: "SubscriptionMarketplace",
    eventName: "AvailabilityRemoved",
    watch: false,
  });

  // Fetch booking events ONCE at parent level, pass to children
  const {
    data: bookingEvents,
    isLoading: isLoadingBookings,
    isFetching: isFetchingBookings,
    refetch: refetchBookings,
  } = useScaffoldEventHistory({
    contractName: "SubscriptionMarketplace",
    eventName: "Booked",
    watch: false,
  });

  const isLoadingEvents = isLoadingCreated || isLoadingRemoved || isLoadingBookings;
  const isRefreshing = isFetchingCreated || isFetchingRemoved || isFetchingBookings;

  // Get set of removed availability IDs
  const removedIds = useMemo(() => {
    if (!removedEvents) return new Set<string>();
    return new Set(
      removedEvents.filter(e => e.args?.availabilityId).map(e => (e.args.availabilityId as bigint).toString()),
    );
  }, [removedEvents]);

  // Filter out removed listings, sorted by ID descending (newest first)
  const listings = useMemo(() => {
    if (!availabilityEvents?.length) return [];

    return availabilityEvents
      .filter(event => event.args && !removedIds.has((event.args.availabilityId as bigint).toString()))
      .map(event => ({
        id: event.args.availabilityId as bigint,
        serialNumber: event.args.serialNumber as bigint,
        owner: event.args.owner as string,
        windowStart: event.args.windowStart as bigint,
        windowEnd: event.args.windowEnd as bigint,
        pricePerDay: event.args.pricePerDay as bigint,
      }))
      .sort((a, b) => (b.id > a.id ? 1 : b.id < a.id ? -1 : 0)) as ListingData[];
  }, [availabilityEvents, removedIds]);

  // Handle pagination
  const { visibleItems, visibleCount, totalCount, hasMore, remainingCount, loadMore, showAll, reset } = usePagination({
    items: listings,
  });

  const handleRefresh = useCallback(() => {
    reset();
    refetchCreated();
    refetchRemoved();
    refetchBookings();
  }, [reset, refetchCreated, refetchRemoved, refetchBookings]);

  if (isLoadingEvents) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AvailabilityCardSkeleton count={6} />
      </div>
    );
  }

  if (listings.length === 0) {
    return <NoListingsState />;
  }

  return (
    <div>
      <ListHeader
        showingCount={visibleCount}
        totalCount={totalCount}
        itemName="listings"
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleItems.map(listing => (
          <AvailabilityCardWithData
            key={listing.id.toString()}
            availabilityId={listing.id}
            serialNumber={listing.serialNumber}
            owner={listing.owner}
            windowStart={listing.windowStart}
            windowEnd={listing.windowEnd}
            pricePerDay={listing.pricePerDay}
            bookingEvents={bookingEvents}
          />
        ))}
      </div>
      {hasMore && <LoadMoreButton remainingCount={remainingCount} onLoadMore={loadMore} onShowAll={showAll} />}
    </div>
  );
};
