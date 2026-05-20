"use client";

import { ClockIcon, TicketIcon } from "@heroicons/react/24/outline";
import { formatDate } from "~~/utils/hedera";

interface PendingSubscription {
  provider: string;
  serviceTier: string;
  startDate: number;
  endDate: number;
}

interface PendingSubscriptionCardProps {
  subscription: PendingSubscription;
}

export const PendingSubscriptionCard = ({ subscription }: PendingSubscriptionCardProps) => {
  const { provider, serviceTier, startDate, endDate } = subscription;

  return (
    <div className="card bg-base-100 border border-primary/50 shadow-md rounded-xl animate-pulse">
      <div className="card-body p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <TicketIcon className="h-5 w-5 text-primary" />
            <span className="text-xs text-base-content/60">Pending...</span>
          </div>
          <span className="badge badge-warning badge-sm flex items-center gap-1">
            <span className="loading loading-spinner loading-xs"></span>
            Processing
          </span>
        </div>

        <h3 className="card-title text-lg">{provider}</h3>
        <p className="text-sm text-base-content/70">{serviceTier}</p>

        <div className="divider my-2"></div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <ClockIcon className="h-4 w-4 text-base-content/60" />
            <span>
              {formatDate(startDate)} - {formatDate(endDate)}
            </span>
          </div>
        </div>

        <p className="text-xs text-base-content/50 mt-4 text-center">Your subscription is being minted on Hedera...</p>
      </div>
    </div>
  );
};
