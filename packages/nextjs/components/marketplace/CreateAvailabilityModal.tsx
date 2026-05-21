"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-hbar";
import {
  GAS_LIMITS,
  SECONDS_PER_DAY,
  formatDate,
  getMidnightUTC,
  hbarToTinybars,
  parseSubscription,
} from "~~/utils/hedera";

interface CreateAvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  serialNumber: bigint;
}

export const CreateAvailabilityModal = ({ isOpen, onClose, serialNumber }: CreateAvailabilityModalProps) => {
  const router = useRouter();
  const [windowStart, setWindowStart] = useState<string>("");
  const [windowEnd, setWindowEnd] = useState<string>("");
  const [pricePerDay, setPricePerDay] = useState<string>("1");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string>("");
  const hasSetDefaults = useRef(false);

  const { data: subscriptionRaw } = useScaffoldReadContract({
    contractName: "SubscriptionNFT",
    functionName: "getSubscription",
    args: [serialNumber],
    query: { enabled: !!serialNumber },
  });

  const subscription = parseSubscription(subscriptionRaw);

  const { writeContractAsync: createAvailability } = useScaffoldWriteContract({
    contractName: "SubscriptionMarketplace",
  });

  // Reset state when modal opens for a different subscription
  useEffect(() => {
    if (isOpen) {
      hasSetDefaults.current = false;
    }
  }, [isOpen, serialNumber]);

  // Set default dates only once when subscription data first loads
  useEffect(() => {
    if (subscription && !hasSetDefaults.current) {
      hasSetDefaults.current = true;
      const today = getMidnightUTC(1);
      const subStart = Number(subscription.startDate);
      const subEnd = Number(subscription.endDate);

      const defaultStart = Math.max(today, subStart);
      const defaultEnd = subEnd;

      setWindowStart(new Date(defaultStart * 1000).toISOString().split("T")[0]);
      setWindowEnd(new Date(defaultEnd * 1000).toISOString().split("T")[0]);
    }
  }, [subscription]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!windowStart || !windowEnd || !pricePerDay) {
      setError("Please fill in all fields");
      return;
    }

    const price = parseFloat(pricePerDay);
    if (isNaN(price) || price <= 0) {
      setError("Please enter a valid price");
      return;
    }

    // Availability start date must be today or in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(windowStart) < today) {
      setError("Availability start date must be today or in the future");
      return;
    }

    setIsCreating(true);

    try {
      const startTimestamp = Math.floor(new Date(windowStart).getTime() / 1000);
      const endTimestamp = Math.floor(new Date(windowEnd).getTime() / 1000);

      const alignedStart = Math.floor(startTimestamp / SECONDS_PER_DAY) * SECONDS_PER_DAY;
      const alignedEnd = Math.floor(endTimestamp / SECONDS_PER_DAY) * SECONDS_PER_DAY;

      const priceTinybars = hbarToTinybars(price);

      await createAvailability({
        functionName: "createAvailability",
        args: [serialNumber, BigInt(alignedStart), BigInt(alignedEnd), priceTinybars],
        gas: GAS_LIMITS.CREATE_AVAILABILITY,
      });

      onClose();
      router.push("/marketplace");
    } catch (err: unknown) {
      console.error("Failed to create availability:", err);
      setError(err instanceof Error ? err.message : "Failed to create listing. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split("T")[0];
  const subStartDate = subscription ? new Date(Number(subscription.startDate) * 1000).toISOString().split("T")[0] : "";
  const subEndDate = subscription ? new Date(Number(subscription.endDate) * 1000).toISOString().split("T")[0] : "";
  // Min start date is the greater of today and subscription start
  const minStartDate = subStartDate && subStartDate > todayStr ? subStartDate : todayStr;

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={onClose}>
          <XMarkIcon className="h-5 w-5" />
        </button>

        <h3 className="font-bold text-lg mb-4">Create Listing</h3>

        {subscription && (
          <div className="bg-primary/10 border border-primary/30 text-primary rounded-lg p-4 mb-4">
            <div>
              <p className="font-semibold">{subscription.provider}</p>
              <p className="text-sm opacity-80">{subscription.serviceTier}</p>
              <p className="text-sm opacity-80">
                Valid: {formatDate(subscription.startDate)} - {formatDate(subscription.endDate)}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Start Date</span>
            </label>
            <input
              type="date"
              className="input input-bordered w-full"
              value={windowStart}
              onChange={e => setWindowStart(e.target.value)}
              min={minStartDate}
              max={subEndDate}
              required
            />
            <label className="label">
              <span className="label-text-alt">Must be today or later, within subscription period</span>
            </label>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">End Date</span>
            </label>
            <input
              type="date"
              className="input input-bordered w-full"
              value={windowEnd}
              onChange={e => setWindowEnd(e.target.value)}
              min={windowStart || subStartDate}
              max={subEndDate}
              required
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Price Per Day (HBAR)</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className="input input-bordered w-full"
              value={pricePerDay}
              onChange={e => setPricePerDay(e.target.value)}
              placeholder="1.00"
              required
            />
          </div>

          {error && (
            <div className="alert alert-error">
              <span>{error}</span>
            </div>
          )}

          <div className="modal-action">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isCreating}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isCreating}>
              {isCreating ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Creating...
                </>
              ) : (
                "Create Listing"
              )}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop bg-base-300/50" onClick={onClose}></div>
    </div>
  );
};
