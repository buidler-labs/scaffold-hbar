"use client";

import { CalendarIcon, CurrencyDollarIcon } from "@heroicons/react/24/outline";
import { formatDate, tinybarsToHbar } from "~~/utils/hedera";

interface PendingAvailability {
  serialNumber: string;
  windowStart: number;
  windowEnd: number;
  pricePerDay: string;
}

interface PendingAvailabilityCardProps {
  availability: PendingAvailability;
}

export const PendingAvailabilityCard = ({ availability }: PendingAvailabilityCardProps) => {
  const { serialNumber, windowStart, windowEnd, pricePerDay } = availability;

  return (
    <div className="card bg-base-100 border border-primary/50 shadow-md rounded-xl animate-pulse">
      <div className="card-body p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            <span className="text-xs text-base-content/60">Pending...</span>
          </div>
          <span className="badge badge-warning badge-sm flex items-center gap-1">
            <span className="loading loading-spinner loading-xs"></span>
            Processing
          </span>
        </div>

        <h3 className="card-title text-lg">Subscription #{serialNumber}</h3>

        <div className="divider my-2"></div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-base-content/60" />
            <span>
              {formatDate(windowStart)} - {formatDate(windowEnd)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CurrencyDollarIcon className="h-4 w-4 text-base-content/60" />
            <span>{tinybarsToHbar(BigInt(pricePerDay))} HBAR/day</span>
          </div>
        </div>

        <p className="text-xs text-base-content/50 mt-4 text-center">Your listing is being created on Hedera...</p>
      </div>
    </div>
  );
};
