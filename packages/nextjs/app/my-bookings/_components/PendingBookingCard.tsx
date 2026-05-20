"use client";

import { BanknotesIcon, CalendarIcon } from "@heroicons/react/24/outline";
import { formatDate, formatHbar } from "~~/utils/hedera";

interface PendingBooking {
  availabilityId: string;
  serialNumber: string;
  startDate: number;
  endDate: number;
  totalPaid: string;
}

interface PendingBookingCardProps {
  booking: PendingBooking;
}

export const PendingBookingCard = ({ booking }: PendingBookingCardProps) => {
  const { serialNumber, startDate, endDate, totalPaid } = booking;

  return (
    <div className="card bg-base-100 border border-primary/50 shadow-md rounded-xl animate-pulse">
      <div className="card-body p-4">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-sm text-base-content/60">New Booking</span>
            <p className="text-xs text-base-content/50">NFT #{serialNumber}</p>
          </div>
          <span className="badge badge-warning badge-sm flex items-center gap-1">
            <span className="loading loading-spinner loading-xs"></span>
            Processing
          </span>
        </div>

        <div className="divider my-2"></div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-base-content/60" />
            <span>
              {formatDate(startDate)} - {formatDate(endDate)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <BanknotesIcon className="h-4 w-4 text-base-content/60" />
            <span>Total: {formatHbar(BigInt(totalPaid))} HBAR</span>
          </div>
        </div>

        <p className="text-xs text-base-content/50 mt-4 text-center">Your booking is being confirmed on Hedera...</p>
      </div>
    </div>
  );
};
