"use client";

import { useMemo, useState } from "react";
import { OwnerBookingCardWithData } from "./OwnerBookingCardWithData";
import { useAccount } from "wagmi";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { BookingCardSkeleton } from "~~/components/marketplace";
import { useScaffoldEventHistory, useScaffoldWriteContract } from "~~/hooks/scaffold-hbar";

const ITEMS_PER_PAGE = 6;

export const OwnerBookings = () => {
  const { address: connectedAddress } = useAccount();
  const [claimingId, setClaimingId] = useState<bigint | null>(null);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  const { data: availabilityEvents, refetch: refetchAvailability } = useScaffoldEventHistory({
    contractName: "SubscriptionMarketplace",
    eventName: "AvailabilityCreated",
    watch: false,
  });

  const {
    data: bookingEvents,
    isLoading,
    refetch: refetchBookings,
  } = useScaffoldEventHistory({
    contractName: "SubscriptionMarketplace",
    eventName: "Booked",
    watch: false,
  });

  const { writeContractAsync: claimPayout } = useScaffoldWriteContract({
    contractName: "SubscriptionMarketplace",
  });

  // Get booking IDs for listings owned by connected user, sorted descending
  const bookingIds = useMemo(() => {
    if (!bookingEvents || !availabilityEvents || !connectedAddress) {
      return [];
    }

    const ownerAvailabilityIds = new Set(
      availabilityEvents
        .filter(event => event.args?.owner?.toLowerCase() === connectedAddress.toLowerCase())
        .map(event => event.args.availabilityId?.toString()),
    );

    return bookingEvents
      .filter(event => event.args && ownerAvailabilityIds.has(event.args.availabilityId?.toString()))
      .map(event => event.args.bookingId as bigint)
      .sort((a, b) => (b > a ? 1 : b < a ? -1 : 0)); // Sort by ID descending (newest first)
  }, [bookingEvents, availabilityEvents, connectedAddress]);

  const visibleBookingIds = bookingIds.slice(0, visibleCount);
  const hasMore = visibleCount < bookingIds.length;
  const remainingCount = bookingIds.length - visibleCount;

  const handleClaimPayout = async (bookingId: bigint) => {
    setClaimingId(bookingId);
    try {
      await claimPayout({
        functionName: "claimBookingPayout",
        args: [bookingId],
        gas: 500_000n,
      });
      // Refresh after successful claim
      refetchBookings();
    } catch (error) {
      console.error("Failed to claim payout:", error);
    } finally {
      setClaimingId(null);
    }
  };

  const handleRefresh = () => {
    setVisibleCount(ITEMS_PER_PAGE);
    refetchAvailability();
    refetchBookings();
  };

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + ITEMS_PER_PAGE);
  };

  if (isLoading) {
    return <BookingCardSkeleton count={2} />;
  }

  if (bookingIds.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-base-content/60">No one has booked your listings yet.</p>
        <a href="/my-subscriptions" className="btn btn-primary btn-sm mt-4">
          Create Listing
        </a>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-base-content/60">
          Showing {visibleBookingIds.length} of {bookingIds.length} bookings on your listings
        </p>
        <button onClick={handleRefresh} className="btn btn-outline btn-sm">
          <ArrowPathIcon className="h-4 w-4" />
          Refresh
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleBookingIds.map(bookingId => (
          <OwnerBookingCardWithData
            key={bookingId.toString()}
            bookingId={bookingId}
            onClaimPayout={handleClaimPayout}
            isClaimingPayout={claimingId === bookingId}
          />
        ))}
      </div>
      {hasMore && (
        <div className="flex justify-center mt-6">
          <button onClick={handleLoadMore} className="btn btn-primary">
            Load More ({remainingCount} remaining)
          </button>
        </div>
      )}
    </div>
  );
};
