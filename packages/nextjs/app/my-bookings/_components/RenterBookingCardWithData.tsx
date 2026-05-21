"use client";

import { BookingCard, BookingCardSkeleton, BookingData } from "~~/components/marketplace";
import { useScaffoldReadContract } from "~~/hooks/scaffold-hbar";
import { parseBooking } from "~~/utils/hedera";

interface RenterBookingCardWithDataProps {
  bookingId: bigint;
  onCancel: (bookingId: bigint) => void;
  isCancelling: boolean;
}

export const RenterBookingCardWithData = ({ bookingId, onCancel, isCancelling }: RenterBookingCardWithDataProps) => {
  const { data: bookingData, isLoading } = useScaffoldReadContract({
    contractName: "SubscriptionMarketplace",
    functionName: "bookingsById",
    args: [bookingId],
    query: { enabled: !!bookingId },
  });

  const booking = parseBooking(bookingData, bookingId);

  if (isLoading || !booking) {
    return <BookingCardSkeleton count={1} />;
  }

  const bookingDataFinal: BookingData = booking;

  return <BookingCard booking={bookingDataFinal} isOwner={false} onCancel={onCancel} isCancelling={isCancelling} />;
};
