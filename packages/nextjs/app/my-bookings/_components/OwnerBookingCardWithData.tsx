"use client";

import { BookingCard, BookingCardSkeleton, BookingData } from "~~/components/marketplace";
import { useScaffoldReadContract } from "~~/hooks/scaffold-hbar";

interface OwnerBookingCardWithDataProps {
  bookingId: bigint;
  onClaimPayout: (bookingId: bigint) => void;
  isClaimingPayout: boolean;
}

export const OwnerBookingCardWithData = ({
  bookingId,
  onClaimPayout,
  isClaimingPayout,
}: OwnerBookingCardWithDataProps) => {
  // Fetch actual booking data from contract
  const { data: bookingData, isLoading } = useScaffoldReadContract({
    contractName: "SubscriptionMarketplace",
    functionName: "bookingsById",
    args: [bookingId],
  });

  if (isLoading || !bookingData) {
    return <BookingCardSkeleton count={1} />;
  }

  // Debug: log the raw data structure
  console.log("Booking data for ID", bookingId.toString(), ":", bookingData);

  // Parse booking data - struct order from contract:
  // id(0), renter(1), availabilityId(2), serialNumber(3), startDate(4), endDate(5),
  // totalPaid(6), feeAmount(7), ownerPayout(8), payoutClaimed(9), status(10)
  const data = bookingData as any;

  const booking: BookingData = {
    id: BigInt(data.id ?? data[0] ?? bookingId),
    renter: String(data.renter ?? data[1] ?? ""),
    availabilityId: BigInt(data.availabilityId ?? data[2] ?? 0),
    serialNumber: BigInt(data.serialNumber ?? data[3] ?? 0),
    startDate: BigInt(data.startDate ?? data[4] ?? 0),
    endDate: BigInt(data.endDate ?? data[5] ?? 0),
    totalPaid: BigInt(data.totalPaid ?? data[6] ?? 0),
    feeAmount: BigInt(data.feeAmount ?? data[7] ?? 0),
    ownerPayout: BigInt(data.ownerPayout ?? data[8] ?? 0),
    payoutClaimed: Boolean(data.payoutClaimed ?? data[9] ?? false),
    status: Number(data.status ?? data[10] ?? 0),
  };

  return (
    <BookingCard booking={booking} isOwner={true} onClaimPayout={onClaimPayout} isClaimingPayout={isClaimingPayout} />
  );
};
