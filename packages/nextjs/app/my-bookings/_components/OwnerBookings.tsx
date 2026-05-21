"use client";

import { useCallback, useMemo, useState } from "react";
import { OwnerBookingCardWithData } from "./OwnerBookingCardWithData";
import { useAccount } from "wagmi";
import { BookingCardSkeleton, EmptyState, ListHeader, LoadMoreButton } from "~~/components/marketplace";
import { usePagination } from "~~/hooks/marketplace";
import { useScaffoldEventHistory, useScaffoldWriteContract } from "~~/hooks/scaffold-hbar";
import { GAS_LIMITS } from "~~/utils/hedera";

export const OwnerBookings = () => {
  const { address: connectedAddress } = useAccount();
  const [claimingId, setClaimingId] = useState<bigint | null>(null);

  const {
    data: availabilityEvents,
    isFetching: isFetchingAvailability,
    refetch: refetchAvailability,
  } = useScaffoldEventHistory({
    contractName: "SubscriptionMarketplace",
    eventName: "AvailabilityCreated",
    watch: false,
  });

  const {
    data: bookingEvents,
    isLoading,
    isFetching: isFetchingBookings,
    refetch: refetchBookings,
  } = useScaffoldEventHistory({
    contractName: "SubscriptionMarketplace",
    eventName: "Booked",
    watch: false,
  });

  const isRefreshing = isFetchingAvailability || isFetchingBookings;

  const { writeContractAsync: claimPayout } = useScaffoldWriteContract({
    contractName: "SubscriptionMarketplace",
  });

  // Get booking IDs for listings owned by connected user, sorted descending
  const bookingIds = useMemo(() => {
    if (!bookingEvents || !availabilityEvents || !connectedAddress) return [];

    const ownerAvailabilityIds = new Set(
      availabilityEvents
        .filter(event => event.args?.owner?.toLowerCase() === connectedAddress.toLowerCase())
        .map(event => event.args.availabilityId?.toString()),
    );

    return bookingEvents
      .filter(event => event.args && ownerAvailabilityIds.has(event.args.availabilityId?.toString()))
      .map(event => event.args.bookingId as bigint)
      .sort((a, b) => (b > a ? 1 : b < a ? -1 : 0));
  }, [bookingEvents, availabilityEvents, connectedAddress]);

  // Handle pagination
  const { visibleItems, visibleCount, totalCount, hasMore, remainingCount, loadMore, reset } = usePagination({
    items: bookingIds,
  });

  const handleClaimPayout = async (bookingId: bigint) => {
    setClaimingId(bookingId);
    try {
      await claimPayout({
        functionName: "claimBookingPayout",
        args: [bookingId],
        gas: GAS_LIMITS.CLAIM_PAYOUT,
      });
      refetchBookings();
    } catch (error) {
      console.error("Failed to claim payout:", error);
    } finally {
      setClaimingId(null);
    }
  };

  const handleRefresh = useCallback(() => {
    reset();
    refetchAvailability();
    refetchBookings();
  }, [reset, refetchAvailability, refetchBookings]);

  if (isLoading) {
    return <BookingCardSkeleton count={2} />;
  }

  if (bookingIds.length === 0) {
    return (
      <EmptyState
        icon="📭"
        title="No Bookings on Your Listings"
        description="No one has booked your listings yet."
        action={{ label: "Create Listing", href: "/my-subscriptions" }}
      />
    );
  }

  return (
    <div>
      <ListHeader
        showingCount={visibleCount}
        totalCount={totalCount}
        itemName="bookings on your listings"
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleItems.map(bookingId => (
          <OwnerBookingCardWithData
            key={bookingId.toString()}
            bookingId={bookingId}
            onClaimPayout={handleClaimPayout}
            isClaimingPayout={claimingId === bookingId}
          />
        ))}
      </div>
      {hasMore && <LoadMoreButton remainingCount={remainingCount} onLoadMore={loadMore} />}
    </div>
  );
};
