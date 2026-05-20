"use client";

import { AddressDisplay } from "./AddressDisplay";
import { DateRangeDisplay } from "./DateDisplay";
import { ClockIcon, TicketIcon, UserIcon } from "@heroicons/react/24/outline";

export interface SubscriptionData {
  serialNumber: bigint;
  provider: string;
  serviceTier: string;
  startDate: bigint;
  endDate: bigint;
  minter: string;
  owner?: string;
  isExpired?: boolean;
}

interface SubscriptionCardProps {
  subscription: SubscriptionData;
  showActions?: boolean;
  onCreateListing?: (serialNumber: bigint) => void;
}

export const SubscriptionCard = ({ subscription, showActions = false, onCreateListing }: SubscriptionCardProps) => {
  const { serialNumber, provider, serviceTier, startDate, endDate, owner, isExpired } = subscription;

  return (
    <div
      className={`card bg-base-100 border border-base-300 shadow-md hover:shadow-xl transition-all rounded-xl ${isExpired ? "opacity-60" : ""}`}
    >
      <div className="card-body p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <TicketIcon className="h-5 w-5 text-primary" />
            <span className="text-xs text-base-content/60">#{serialNumber.toString()}</span>
          </div>
          {isExpired && <span className="badge badge-error badge-sm">Expired</span>}
        </div>

        <h3 className="card-title text-lg">{provider}</h3>
        <p className="text-sm text-base-content/70">{serviceTier}</p>

        <div className="divider my-2"></div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <ClockIcon className="h-4 w-4 text-base-content/60" />
            <DateRangeDisplay start={startDate} end={endDate} />
          </div>
          {owner && (
            <div className="flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-base-content/60" />
              <AddressDisplay address={owner} size="sm" />
            </div>
          )}
        </div>

        {showActions && !isExpired && (
          <div className="card-actions justify-end mt-4">
            <button className="btn btn-primary btn-sm" onClick={() => onCreateListing?.(serialNumber)}>
              Create Listing
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

interface SubscriptionCardSkeletonProps {
  count?: number;
}

export const SubscriptionCardSkeleton = ({ count = 1 }: SubscriptionCardSkeletonProps) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card bg-base-100 border border-base-300 shadow-md rounded-xl animate-pulse">
          <div className="card-body p-4">
            <div className="flex items-start justify-between">
              <div className="h-5 w-16 bg-base-300 rounded"></div>
            </div>
            <div className="h-6 w-32 bg-base-300 rounded mt-2"></div>
            <div className="h-4 w-24 bg-base-300 rounded mt-1"></div>
            <div className="divider my-2"></div>
            <div className="h-4 w-full bg-base-300 rounded"></div>
            <div className="h-4 w-3/4 bg-base-300 rounded"></div>
          </div>
        </div>
      ))}
    </>
  );
};
