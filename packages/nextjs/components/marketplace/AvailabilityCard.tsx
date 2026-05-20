"use client";

import Link from "next/link";
import { AddressDisplay } from "./AddressDisplay";
import { DateRangeDisplay } from "./DateDisplay";
import { HbarPricePerDay } from "./HbarAmount";
import { CalendarIcon, CurrencyDollarIcon, UserIcon } from "@heroicons/react/24/outline";
import { calculateDays } from "~~/utils/hedera";

export enum AvailabilityStatus {
  Active = 0,
  Removed = 1,
}

export interface AvailabilityData {
  id: bigint;
  serialNumber: bigint;
  owner: string;
  windowStart: bigint;
  windowEnd: bigint;
  pricePerDay: bigint;
  status: number;
  subscriptionProvider?: string;
  subscriptionTier?: string;
  availableDays?: number;
  totalDays?: number;
}

interface AvailabilityCardProps {
  availability: AvailabilityData;
  showBookButton?: boolean;
}

export const AvailabilityCard = ({ availability, showBookButton = true }: AvailabilityCardProps) => {
  const {
    id,
    serialNumber,
    owner,
    windowStart,
    windowEnd,
    pricePerDay,
    status,
    subscriptionProvider,
    subscriptionTier,
    availableDays,
    totalDays,
  } = availability;

  const isActive = status === AvailabilityStatus.Active;
  const calculatedTotalDays = totalDays ?? calculateDays(windowStart, windowEnd);
  const daysAvailable = availableDays ?? calculatedTotalDays;
  const isFullyBooked = daysAvailable === 0;

  return (
    <div
      className={`card bg-base-100 border border-base-300 shadow-md hover:shadow-xl transition-all rounded-xl ${!isActive || isFullyBooked ? "opacity-60" : ""}`}
    >
      <div className="card-body p-4">
        <div className="flex items-start justify-between">
          <div>
            {subscriptionProvider ? (
              <>
                <h3 className="card-title text-lg">{subscriptionProvider}</h3>
                {subscriptionTier && <p className="text-sm text-base-content/70">{subscriptionTier}</p>}
              </>
            ) : (
              <span className="text-sm text-base-content/60">NFT #{serialNumber.toString()}</span>
            )}
          </div>
          <div className={`badge badge-sm ${isFullyBooked ? "badge-error" : "badge-outline"}`}>
            {isFullyBooked ? "Fully Booked" : isActive ? "Available" : "Removed"}
          </div>
        </div>

        <div className="divider my-2"></div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-base-content/60" />
            <DateRangeDisplay start={windowStart} end={windowEnd} />
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs ${daysAvailable < calculatedTotalDays ? "text-warning" : "text-base-content/60"}`}
            >
              {daysAvailable} of {calculatedTotalDays} days available
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CurrencyDollarIcon className="h-4 w-4 text-base-content/60" />
            <HbarPricePerDay tinybars={pricePerDay} />
          </div>
          <div className="flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-base-content/60" />
            <span className="text-xs">Owner:</span>
            <AddressDisplay address={owner} size="sm" />
          </div>
        </div>

        {showBookButton && isActive && (
          <div className="card-actions justify-end mt-4">
            <Link href={`/marketplace/listing/${id.toString()}`} className="btn btn-primary btn-sm">
              View Details
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export const AvailabilityCardSkeleton = ({ count = 1 }: { count?: number }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card bg-base-100 border border-base-300 shadow-md rounded-xl animate-pulse">
          <div className="card-body p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="h-6 w-32 bg-base-300 rounded"></div>
                <div className="h-4 w-24 bg-base-300 rounded mt-1"></div>
              </div>
              <div className="h-5 w-16 bg-base-300 rounded"></div>
            </div>
            <div className="divider my-2"></div>
            <div className="space-y-2">
              <div className="h-4 w-full bg-base-300 rounded"></div>
              <div className="h-4 w-3/4 bg-base-300 rounded"></div>
              <div className="h-4 w-1/2 bg-base-300 rounded"></div>
            </div>
            <div className="flex justify-end mt-4">
              <div className="h-8 w-24 bg-base-300 rounded"></div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
};
