"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import {
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  TicketIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { AddressDisplay, DateRangeDisplay, HbarAmount, HbarPricePerDay } from "~~/components/marketplace";
import { useScaffoldEventHistory, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-hbar";
import {
  GAS_LIMITS,
  SECONDS_PER_DAY,
  STORAGE_KEYS,
  ZERO_ADDRESS,
  calculateDays,
  formatDate,
  formatHbar,
  getMidnightUTC,
  parseAvailabilityTuple,
  parseSubscription,
  tinybarsToWei,
} from "~~/utils/hedera";

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { address: connectedAddress } = useAccount();
  const availabilityId = BigInt(params.id as string);

  const [startDate, setStartDate] = useState<string>("");
  const [numberOfDays, setNumberOfDays] = useState<number>(1);
  const [isBooking, setIsBooking] = useState(false);

  const { data: availabilityRaw, isLoading: isLoadingAvailability } = useScaffoldReadContract({
    contractName: "SubscriptionMarketplace",
    functionName: "availabilities",
    args: [availabilityId],
  });

  const availability = parseAvailabilityTuple(availabilityRaw);
  const serialNumber = availability?.serialNumber;

  const { data: subscriptionRaw } = useScaffoldReadContract({
    contractName: "SubscriptionNFT",
    functionName: "getSubscription",
    args: [serialNumber!],
    query: { enabled: !!serialNumber },
  });

  const subscription = parseSubscription(subscriptionRaw);

  const { data: currentUser } = useScaffoldReadContract({
    contractName: "SubscriptionMarketplace",
    functionName: "userOf",
    args: [serialNumber!],
    query: { enabled: !!serialNumber },
  });

  const { writeContractAsync: bookListing } = useScaffoldWriteContract({
    contractName: "SubscriptionMarketplace",
  });

  // Fetch booking events for this availability
  const { data: bookingEvents } = useScaffoldEventHistory({
    contractName: "SubscriptionMarketplace",
    eventName: "Booked",
    watch: false,
  });

  // Calculate booked periods and available days
  const { bookedPeriods, totalBookedDays, availableDays } = useMemo(() => {
    const now = Math.floor(Date.now() / 1000);
    const periods: { startDate: number; endDate: number; renter: string }[] = [];
    let bookedDays = 0;

    if (bookingEvents && availability) {
      bookingEvents
        .filter(event => event.args?.availabilityId?.toString() === availabilityId.toString())
        .forEach(event => {
          const eventStart = Number(event.args.startDate);
          const eventEnd = Number(event.args.endDate);
          const renter = event.args.renter as string;

          periods.push({ startDate: eventStart, endDate: eventEnd, renter });

          // Count future/current booked days
          if (eventEnd > now) {
            const effectiveStart = Math.max(eventStart, now);
            const days = Math.ceil((eventEnd - effectiveStart) / SECONDS_PER_DAY);
            bookedDays += days;
          }
        });
    }

    // Sort by start date (newest first)
    periods.sort((a, b) => b.startDate - a.startDate);

    const totalDays = availability ? calculateDays(availability.windowStart, availability.windowEnd) : 0;
    const available = Math.max(0, totalDays - bookedDays);

    return { bookedPeriods: periods, totalBookedDays: bookedDays, availableDays: available };
  }, [bookingEvents, availabilityId, availability]);

  const isActive = availability?.isActive ?? false;
  const isOwner = availability?.owner?.toLowerCase() === connectedAddress?.toLowerCase();

  const pricePerDayTinybars = availability?.pricePerDay ?? 0n;
  const totalCostTinybars = pricePerDayTinybars * BigInt(numberOfDays);
  const totalCostWei = tinybarsToWei(totalCostTinybars);

  const windowStart = availability ? Number(availability.windowStart) : 0;
  const windowEnd = availability ? Number(availability.windowEnd) : 0;
  const maxDays = calculateDays(windowStart, windowEnd);

  useEffect(() => {
    if (availability) {
      const today = getMidnightUTC(0);
      const defaultStart = Math.max(today, windowStart);
      const date = new Date(defaultStart * 1000);
      setStartDate(date.toISOString().split("T")[0]);
    }
  }, [availability, windowStart]);

  const handleBook = async () => {
    if (!availability || !startDate || numberOfDays < 1) return;

    setIsBooking(true);
    try {
      const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
      const alignedStart = Math.floor(startTimestamp / SECONDS_PER_DAY) * SECONDS_PER_DAY;

      await bookListing({
        functionName: "book",
        args: [availabilityId, BigInt(alignedStart), BigInt(numberOfDays)],
        value: totalCostWei,
        gas: GAS_LIMITS.BOOK,
      });

      // Store pending booking for optimistic UI
      const pendingBooking = {
        availabilityId: availabilityId.toString(),
        serialNumber: availability.serialNumber.toString(),
        startDate: alignedStart,
        endDate: alignedStart + numberOfDays * SECONDS_PER_DAY,
        totalPaid: totalCostTinybars.toString(),
        timestamp: Date.now(),
      };
      sessionStorage.setItem(STORAGE_KEYS.PENDING_BOOKING, JSON.stringify(pendingBooking));

      router.push("/my-bookings");
    } catch (error) {
      console.error("Booking failed:", error);
    } finally {
      setIsBooking(false);
    }
  };

  if (isLoadingAvailability) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-base-300 rounded mb-4"></div>
          <div className="h-64 bg-base-300 rounded"></div>
        </div>
      </div>
    );
  }

  if (!availability) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Listing Not Found</h1>
        <Link href="/marketplace" className="btn btn-primary">
          Back to Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/marketplace" className="btn btn-ghost btn-sm mb-6">
        <ArrowLeftIcon className="h-4 w-4" />
        Back to Marketplace
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="card bg-base-100 border border-base-300 shadow-md rounded-xl">
            <div className="card-body">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold">
                    {subscription ? subscription.provider : `NFT #${availability.serialNumber.toString()}`}
                  </h1>
                  {subscription && <p className="text-base-content/70">{subscription.serviceTier}</p>}
                </div>
                <div className="badge badge-lg">
                  {isActive ? (
                    <span className="text-success">Available</span>
                  ) : (
                    <span className="text-error">Unavailable</span>
                  )}
                </div>
              </div>

              <div className="divider"></div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <CalendarIcon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-base-content/60">Rental Window</p>
                    <DateRangeDisplay
                      start={availability.windowStart}
                      end={availability.windowEnd}
                      className="font-semibold"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <CurrencyDollarIcon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-base-content/60">Price</p>
                    <HbarPricePerDay tinybars={availability.pricePerDay} className="font-semibold" />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <UserIcon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-base-content/60">Owner</p>
                    <AddressDisplay address={availability.owner} />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <TicketIcon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-base-content/60">NFT Serial</p>
                    <p className="font-semibold">#{availability.serialNumber.toString()}</p>
                  </div>
                </div>
              </div>

              {currentUser && currentUser !== ZERO_ADDRESS && (
                <div className="bg-primary/10 border border-primary/30 text-primary rounded-lg p-4 mt-4">
                  <span>
                    Currently rented by: <AddressDisplay address={currentUser} />
                  </span>
                </div>
              )}
            </div>
          </div>

          {subscription && (
            <div className="card bg-base-100 border border-base-300 shadow-md rounded-xl">
              <div className="card-body">
                <h2 className="card-title">Subscription Details</h2>
                <div className="divider my-2"></div>
                <div className="space-y-2">
                  <p>
                    <span className="text-base-content/60">Provider:</span>{" "}
                    <span className="font-semibold">{subscription.provider}</span>
                  </p>
                  <p>
                    <span className="text-base-content/60">Tier:</span>{" "}
                    <span className="font-semibold">{subscription.serviceTier}</span>
                  </p>
                  <p>
                    <span className="text-base-content/60">Subscription Period:</span>{" "}
                    <DateRangeDisplay
                      start={subscription.startDate}
                      end={subscription.endDate}
                      className="font-semibold"
                    />
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Availability Stats */}
          <div className="card bg-base-100 border border-base-300 shadow-md rounded-xl">
            <div className="card-body">
              <h2 className="card-title flex items-center gap-2">
                <ClockIcon className="h-5 w-5" />
                Availability
              </h2>
              <div className="divider my-2"></div>

              <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
                <div className="stat">
                  <div className="stat-title">Available Days</div>
                  <div className={`stat-value ${availableDays === 0 ? "text-error" : "text-success"}`}>
                    {availableDays}
                  </div>
                  <div className="stat-desc">of {maxDays} total days</div>
                </div>
                <div className="stat">
                  <div className="stat-title">Booked Days</div>
                  <div className="stat-value text-warning">{totalBookedDays}</div>
                  <div className="stat-desc">{bookedPeriods.length} booking(s)</div>
                </div>
              </div>

              {bookedPeriods.length > 0 && (
                <>
                  <h3 className="font-semibold mt-4 mb-2">Booked Periods</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {bookedPeriods.map((period, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-base-300 rounded-lg text-sm">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-base-content/60" />
                          <span>
                            {formatDate(period.startDate)} - {formatDate(period.endDate)}
                          </span>
                        </div>
                        <AddressDisplay address={period.renter} size="xs" />
                      </div>
                    ))}
                  </div>
                </>
              )}

              {bookedPeriods.length === 0 && (
                <p className="text-base-content/60 text-sm mt-2">No bookings yet. All days are available!</p>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="card bg-base-100 border border-base-300 shadow-md rounded-xl sticky top-4">
            <div className="card-body">
              <h2 className="card-title">Book This Rental</h2>

              {!connectedAddress ? (
                <div className="alert alert-warning">
                  <span>Connect your wallet to book this rental</span>
                </div>
              ) : isOwner ? (
                <div className="bg-primary/10 border border-primary/30 text-primary rounded-lg p-4">
                  <span>You own this listing</span>
                </div>
              ) : !isActive ? (
                <div className="alert alert-error">
                  <span>This listing is no longer available</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Start Date</span>
                    </label>
                    <input
                      type="date"
                      className="input input-bordered w-full"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      min={new Date(windowStart * 1000).toISOString().split("T")[0]}
                      max={new Date(windowEnd * 1000).toISOString().split("T")[0]}
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Number of Days</span>
                      <span className="label-text-alt">Max: {maxDays}</span>
                    </label>
                    <input
                      type="number"
                      className="input input-bordered w-full"
                      value={numberOfDays}
                      onChange={e => setNumberOfDays(Math.max(1, Math.min(maxDays, parseInt(e.target.value) || 1)))}
                      min={1}
                      max={maxDays}
                    />
                  </div>

                  <div className="divider"></div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-base-content/60">Price per day</span>
                      <HbarAmount tinybars={pricePerDayTinybars} />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-base-content/60">Days</span>
                      <span>{numberOfDays}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <HbarAmount tinybars={totalCostTinybars} />
                    </div>
                  </div>

                  <button
                    className="btn btn-primary w-full"
                    onClick={handleBook}
                    disabled={isBooking || !startDate || numberOfDays < 1}
                  >
                    {isBooking ? (
                      <>
                        <span className="loading loading-spinner loading-sm"></span>
                        Booking...
                      </>
                    ) : (
                      `Book for ${formatHbar(totalCostTinybars)} HBAR`
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
