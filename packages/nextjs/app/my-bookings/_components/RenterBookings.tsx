"use client";

import { useCallback, useMemo, useState } from "react";
import { PendingBookingCard } from "./PendingBookingCard";
import { RenterBookingCardWithData } from "./RenterBookingCardWithData";
import { useAccount } from "wagmi";
import { BookingCardSkeleton, ListHeader, LoadMoreButton, NoBookingsState } from "~~/components/marketplace";
import { usePagination, usePendingItem } from "~~/hooks/marketplace";
import { useScaffoldEventHistory, useScaffoldWriteContract } from "~~/hooks/scaffold-hbar";
import { GAS_LIMITS, STORAGE_KEYS } from "~~/utils/hedera";

interface PendingBooking {
  availabilityId: string;
  serialNumber: string;
  startDate: number;
  endDate: number;
  totalPaid: string;
  timestamp: number;
}

export const RenterBookings = () => {
  const { address: connectedAddress } = useAccount();
  const [cancellingId, setCancellingId] = useState<bigint | null>(null);

  const {
    data: bookingEvents,
    isLoading,
    isFetching,
    refetch,
  } = useScaffoldEventHistory({
    contractName: "SubscriptionMarketplace",
    eventName: "Booked",
    watch: false,
  });

  const { writeContractAsync: cancelBooking } = useScaffoldWriteContract({
    contractName: "SubscriptionMarketplace",
  });

  // Extract booking IDs, sorted descending (newest first)
  const bookingIds = useMemo(() => {
    if (!bookingEvents || !connectedAddress) return [];

    return bookingEvents
      .filter(event => event.args?.renter?.toLowerCase() === connectedAddress.toLowerCase())
      .map(event => event.args.bookingId as bigint)
      .sort((a, b) => (b > a ? 1 : b < a ? -1 : 0));
  }, [bookingEvents, connectedAddress]);

  // Handle pending booking with optimistic UI
  const { pendingItem: pendingBooking, isPending } = usePendingItem<PendingBooking>({
    storageKey: STORAGE_KEYS.PENDING_BOOKING,
    currentCount: bookingIds.length,
    isLoading,
    refetch,
  });

  // Handle pagination
  const { visibleItems, visibleCount, hasMore, remainingCount, loadMore, reset } = usePagination({ items: bookingIds });

  const handleCancel = async (bookingId: bigint) => {
    setCancellingId(bookingId);
    try {
      await cancelBooking({
        functionName: "cancelBooking",
        args: [bookingId],
        gas: GAS_LIMITS.CANCEL_BOOKING,
      });
      refetch();
    } catch (error) {
      console.error("Failed to cancel booking:", error);
    } finally {
      setCancellingId(null);
    }
  };

  const handleRefresh = useCallback(() => {
    reset();
    refetch();
  }, [reset, refetch]);

  if (isLoading) {
    return <BookingCardSkeleton count={2} />;
  }

  if (bookingIds.length === 0 && !pendingBooking) {
    return <NoBookingsState />;
  }

  const totalCount = bookingIds.length + (pendingBooking ? 1 : 0);
  const showingCount = visibleCount + (pendingBooking ? 1 : 0);

  return (
    <div>
      <ListHeader
        showingCount={showingCount}
        totalCount={totalCount}
        itemName="bookings"
        onRefresh={handleRefresh}
        isPending={isPending}
        pendingMessage="Processing new booking..."
        isRefreshing={isFetching}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pendingBooking && <PendingBookingCard booking={pendingBooking} />}
        {visibleItems.map(bookingId => (
          <RenterBookingCardWithData
            key={bookingId.toString()}
            bookingId={bookingId}
            onCancel={handleCancel}
            isCancelling={cancellingId === bookingId}
          />
        ))}
      </div>
      {hasMore && <LoadMoreButton remainingCount={remainingCount} onLoadMore={loadMore} />}
    </div>
  );
};
