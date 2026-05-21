"use client";

import { useMemo } from "react";
import { AvailabilityCard, AvailabilityCardSkeleton, AvailabilityStatus } from "~~/components/marketplace";
import { useScaffoldReadContract } from "~~/hooks/scaffold-hbar";
import { SECONDS_PER_DAY, calculateDays, parseSubscription } from "~~/utils/hedera";

// Type for booking events passed from parent
type BookingEvent = {
  args: {
    availabilityId?: bigint;
    startDate?: bigint;
    endDate?: bigint;
    [key: string]: unknown;
  };
};

interface AvailabilityCardWithDataProps {
  availabilityId: bigint;
  serialNumber: bigint;
  owner: string;
  windowStart: bigint;
  windowEnd: bigint;
  pricePerDay: bigint;
  bookingEvents?: BookingEvent[];
}

export const AvailabilityCardWithData = ({
  availabilityId,
  serialNumber,
  owner,
  windowStart,
  windowEnd,
  pricePerDay,
  bookingEvents,
}: AvailabilityCardWithDataProps) => {
  const { data: subscriptionRaw, isLoading: isLoadingSubscription } = useScaffoldReadContract({
    contractName: "SubscriptionNFT",
    functionName: "getSubscription",
    args: [serialNumber],
    query: { enabled: !!serialNumber },
  });

  const subscription = parseSubscription(subscriptionRaw);

  // Calculate booked days for this availability
  const bookedDays = useMemo(() => {
    if (!bookingEvents) return 0;

    const now = Math.floor(Date.now() / 1000);
    let totalBookedDays = 0;

    bookingEvents
      .filter(event => event.args?.availabilityId?.toString() === availabilityId.toString())
      .forEach(event => {
        const startDate = Number(event.args.startDate);
        const endDate = Number(event.args.endDate);

        // Only count future/current bookings
        if (endDate > now) {
          const effectiveStart = Math.max(startDate, now);
          const days = Math.ceil((endDate - effectiveStart) / SECONDS_PER_DAY);
          totalBookedDays += days;
        }
      });

    return totalBookedDays;
  }, [bookingEvents, availabilityId]);

  const totalDays = calculateDays(windowStart, windowEnd);
  const availableDays = Math.max(0, totalDays - bookedDays);

  if (isLoadingSubscription) {
    return <AvailabilityCardSkeleton count={1} />;
  }

  return (
    <AvailabilityCard
      availability={{
        id: availabilityId,
        serialNumber,
        owner,
        windowStart,
        windowEnd,
        pricePerDay,
        status: AvailabilityStatus.Active,
        subscriptionProvider: subscription?.provider,
        subscriptionTier: subscription?.serviceTier,
        availableDays,
        totalDays,
      }}
    />
  );
};
