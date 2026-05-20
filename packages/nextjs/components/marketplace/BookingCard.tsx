"use client";

import { AddressDisplay } from "./AddressDisplay";
import { DateRangeDisplay } from "./DateDisplay";
import { HbarAmount } from "./HbarAmount";
import { BanknotesIcon, CalendarIcon, CheckCircleIcon, UserIcon } from "@heroicons/react/24/outline";
import { isDateInPast } from "~~/utils/hedera";

export enum BookingStatus {
  Active = 0,
  Cancelled = 1,
}

export interface BookingData {
  id: bigint;
  renter: string;
  availabilityId: bigint;
  serialNumber: bigint;
  startDate: bigint;
  endDate: bigint;
  totalPaid: bigint;
  feeAmount: bigint;
  ownerPayout: bigint;
  payoutClaimed: boolean;
  status: number;
}

interface BookingCardProps {
  booking: BookingData;
  isOwner?: boolean;
  onClaimPayout?: (bookingId: bigint) => void;
  onCancel?: (bookingId: bigint) => void;
  isClaimingPayout?: boolean;
  isCancelling?: boolean;
}

export const BookingCard = ({
  booking,
  isOwner = false,
  onClaimPayout,
  onCancel,
  isClaimingPayout = false,
  isCancelling = false,
}: BookingCardProps) => {
  const { id, renter, serialNumber, startDate, endDate, totalPaid, ownerPayout, payoutClaimed, status } = booking;

  const isActive = status === BookingStatus.Active;
  const hasStarted = isDateInPast(startDate);
  const hasEnded = isDateInPast(endDate);
  const canCancel = isActive && !hasStarted;
  const canClaimPayout = isOwner && isActive && hasStarted && !payoutClaimed;

  const getStatusBadge = () => {
    if (status === BookingStatus.Cancelled) return <span className="badge badge-error">Cancelled</span>;
    if (hasEnded) return <span className="badge badge-success">Completed</span>;
    if (hasStarted) return <span className="badge badge-info">Active</span>;
    return <span className="badge badge-warning">Upcoming</span>;
  };

  return (
    <div
      className={`card bg-base-100 border border-base-300 shadow-md hover:shadow-xl transition-all rounded-xl ${!isActive ? "opacity-60" : ""}`}
    >
      <div className="card-body p-4">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-sm text-base-content/60">Booking #{id.toString()}</span>
            <p className="text-xs text-base-content/50">NFT #{serialNumber.toString()}</p>
          </div>
          {getStatusBadge()}
        </div>

        <div className="divider my-2"></div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-base-content/60" />
            <DateRangeDisplay start={startDate} end={endDate} />
          </div>
          <div className="flex items-center gap-2">
            <BanknotesIcon className="h-4 w-4 text-base-content/60" />
            <span>Total:</span>
            <HbarAmount tinybars={totalPaid} />
          </div>
          {isOwner && (
            <div className="flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-base-content/60" />
              <span className="text-xs">Renter:</span>
              <AddressDisplay address={renter} size="sm" />
            </div>
          )}
          {isOwner && (
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="h-4 w-4 text-base-content/60" />
              <span>Your payout:</span>
              <HbarAmount tinybars={ownerPayout} />
              {payoutClaimed && <span className="badge badge-success badge-xs">Claimed</span>}
            </div>
          )}
        </div>

        <div className="card-actions justify-end mt-4">
          {canCancel && !isOwner && (
            <button className="btn btn-error btn-sm" onClick={() => onCancel?.(id)} disabled={isCancelling}>
              {isCancelling ? <span className="loading loading-spinner loading-sm"></span> : "Cancel"}
            </button>
          )}
          {canClaimPayout && (
            <button className="btn btn-success btn-sm" onClick={() => onClaimPayout?.(id)} disabled={isClaimingPayout}>
              {isClaimingPayout ? <span className="loading loading-spinner loading-sm"></span> : "Claim Payout"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const BookingCardSkeleton = ({ count = 1 }: { count?: number }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card bg-base-100 border border-base-300 shadow-md rounded-xl animate-pulse">
          <div className="card-body p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="h-4 w-24 bg-base-300 rounded"></div>
                <div className="h-3 w-16 bg-base-300 rounded mt-1"></div>
              </div>
              <div className="h-5 w-16 bg-base-300 rounded"></div>
            </div>
            <div className="divider my-2"></div>
            <div className="space-y-2">
              <div className="h-4 w-full bg-base-300 rounded"></div>
              <div className="h-4 w-3/4 bg-base-300 rounded"></div>
              <div className="h-4 w-1/2 bg-base-300 rounded"></div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
};
