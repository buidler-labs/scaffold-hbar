"use client";

import { useMemo } from "react";
import { AvailabilityCard, AvailabilityCardSkeleton, AvailabilityStatus } from "~~/components/marketplace";
import { useScaffoldEventHistory, useScaffoldReadContract } from "~~/hooks/scaffold-hbar";
import { SECONDS_PER_DAY, calculateDays } from "~~/utils/hedera";

interface AvailabilityCardWithDataProps {
  availabilityId: bigint;
  serialNumber: bigint;
  owner: string;
  windowStart: bigint;
  windowEnd: bigint;
  pricePerDay: bigint;
}

export const AvailabilityCardWithData = ({
  availabilityId,
  serialNumber,
  owner,
  windowStart,
  windowEnd,
  pricePerDay,
}: AvailabilityCardWithDataProps) => {
  // Fetch subscription details
  const { data: subscriptionRaw, isLoading: isLoadingSubscription } = useScaffoldReadContract({
    contractName: "SubscriptionNFT",
    functionName: "getSubscription",
    args: [serialNumber],
  });

  // Fetch booking events for this availability
  const { data: bookingEvents } = useScaffoldEventHistory({
    contractName: "SubscriptionMarketplace",
    eventName: "Booked",
    watch: false,
  });

  // Parse subscription data
  const subscription = useMemo(() => {
    if (!subscriptionRaw) return null;
    const data = subscriptionRaw as any;
    return {
      provider: String(data.provider ?? data[1] ?? "Unknown"),
      serviceTier: String(data.serviceTier ?? data[2] ?? "Unknown"),
    };
  }, [subscriptionRaw]);

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
