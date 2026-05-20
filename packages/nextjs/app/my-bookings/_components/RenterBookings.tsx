"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PendingBookingCard } from "./PendingBookingCard";
import { useAccount } from "wagmi";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { BookingCard, BookingCardSkeleton, BookingData } from "~~/components/marketplace";
import { useScaffoldEventHistory, useScaffoldWriteContract } from "~~/hooks/scaffold-hbar";

const ITEMS_PER_PAGE = 6;
const POLL_INTERVAL = 3000;

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
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [pendingBooking, setPendingBooking] = useState<PendingBooking | null>(null);
  const [previousCount, setPreviousCount] = useState<number | null>(null);

  const {
    data: bookingEvents,
    isLoading,
    refetch,
  } = useScaffoldEventHistory({
    contractName: "SubscriptionMarketplace",
    eventName: "Booked",
    watch: false,
  });

  const { writeContractAsync: cancelBooking } = useScaffoldWriteContract({
    contractName: "SubscriptionMarketplace",
  });

  // Sorted by booking ID descending (newest first)
  const bookings = useMemo(() => {
    if (!bookingEvents || !connectedAddress) {
      return [];
    }

    return bookingEvents
      .filter(event => event.args && event.args.renter?.toLowerCase() === connectedAddress.toLowerCase())
      .map(event => ({
        id: event.args.bookingId as bigint,
        renter: event.args.renter as string,
        availabilityId: event.args.availabilityId as bigint,
        serialNumber: event.args.serialNumber as bigint,
        startDate: event.args.startDate as bigint,
        endDate: event.args.endDate as bigint,
        totalPaid: event.args.totalPaid as bigint,
        feeAmount: 0n,
        ownerPayout: 0n,
        payoutClaimed: false,
        status: 0,
      }))
      .sort((a, b) => (b.id > a.id ? 1 : b.id < a.id ? -1 : 0)) as BookingData[]; // Sort by ID descending
  }, [bookingEvents, connectedAddress]);

  // Check for pending booking on mount
  useEffect(() => {
    const stored = sessionStorage.getItem("pendingBooking");
    if (stored) {
      try {
        const pending = JSON.parse(stored) as PendingBooking;
        if (Date.now() - pending.timestamp < 5 * 60 * 1000) {
          setPendingBooking(pending);
          setPreviousCount(bookings.length);
        } else {
          sessionStorage.removeItem("pendingBooking");
        }
      } catch {
        sessionStorage.removeItem("pendingBooking");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll while pending
  useEffect(() => {
    if (!pendingBooking) return;

    const interval = setInterval(() => {
      refetch();
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [pendingBooking, refetch]);

  // Clear pending when confirmed
  useEffect(() => {
    if (pendingBooking && previousCount !== null && bookings.length > previousCount) {
      sessionStorage.removeItem("pendingBooking");
      setPendingBooking(null);
      setPreviousCount(null);
    }
  }, [bookings.length, pendingBooking, previousCount]);

  const visibleBookings = bookings.slice(0, visibleCount);
  const hasMore = visibleCount < bookings.length;
  const remainingCount = bookings.length - visibleCount;

  const handleCancel = async (bookingId: bigint) => {
    setCancellingId(bookingId);
    try {
      await cancelBooking({
        functionName: "cancelBooking",
        args: [bookingId],
        gas: 500_000n,
      });
    } catch (error) {
      console.error("Failed to cancel booking:", error);
    } finally {
      setCancellingId(null);
    }
  };

  const handleRefresh = useCallback(() => {
    setVisibleCount(ITEMS_PER_PAGE);
    refetch();
  }, [refetch]);

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + ITEMS_PER_PAGE);
  };

  if (isLoading) {
    return <BookingCardSkeleton count={2} />;
  }

  if (bookings.length === 0 && !pendingBooking) {
    return (
      <div className="text-center py-8">
        <p className="text-base-content/60">You haven&apos;t made any bookings yet.</p>
        <a href="/marketplace" className="btn btn-primary btn-sm mt-4">
          Browse Marketplace
        </a>
      </div>
    );
  }

  const totalCount = bookings.length + (pendingBooking ? 1 : 0);
  const showingCount = visibleBookings.length + (pendingBooking ? 1 : 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-base-content/60">
          {pendingBooking ? (
            <span className="flex items-center gap-2">
              <span className="loading loading-spinner loading-xs"></span>
              Processing new booking...
            </span>
          ) : (
            `Showing ${showingCount} of ${totalCount} bookings`
          )}
        </p>
        <button onClick={handleRefresh} className="btn btn-outline btn-sm">
          <ArrowPathIcon className="h-4 w-4" />
          Refresh
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pendingBooking && <PendingBookingCard booking={pendingBooking} />}
        {visibleBookings.map(booking => (
          <BookingCard
            key={booking.id.toString()}
            booking={booking}
            isOwner={false}
            onCancel={handleCancel}
            isCancelling={cancellingId === booking.id}
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
