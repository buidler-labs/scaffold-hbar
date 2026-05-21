/**
 * Utility functions for parsing Solidity struct data from contract reads.
 * Handles both named property access and index-based fallback for compatibility
 * with different return formats.
 */

// Helper to safely convert to bigint
const toBigInt = (value: unknown): bigint => {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (typeof value === "string") return BigInt(value || "0");
  return 0n;
};

export interface ParsedSubscription {
  minter: string;
  provider: string;
  serviceTier: string;
  startDate: bigint;
  endDate: bigint;
}

export interface ParsedBooking {
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

export interface ParsedAvailability {
  id: bigint;
  owner: string;
  serialNumber: bigint;
  pricePerDay: bigint;
  windowStart: bigint;
  windowEnd: bigint;
  isActive: boolean;
}

/**
 * Parse subscription data from SubscriptionNFT.getSubscription()
 * Struct order: minter(0), provider(1), serviceTier(2), startDate(3), endDate(4)
 */
export function parseSubscription(data: unknown): ParsedSubscription | null {
  if (!data) return null;

  const d = data as Record<string, unknown>;

  return {
    minter: String(d.minter ?? d[0] ?? ""),
    provider: String(d.provider ?? d[1] ?? "Unknown"),
    serviceTier: String(d.serviceTier ?? d[2] ?? "Unknown"),
    startDate: toBigInt(d.startDate ?? d[3]),
    endDate: toBigInt(d.endDate ?? d[4]),
  };
}

/**
 * Parse booking data from SubscriptionMarketplace.bookingsById()
 * Struct order: id(0), renter(1), availabilityId(2), serialNumber(3), startDate(4), endDate(5),
 *               totalPaid(6), feeAmount(7), ownerPayout(8), payoutClaimed(9), status(10)
 */
export function parseBooking(data: unknown, fallbackId?: bigint): ParsedBooking | null {
  if (!data) return null;

  const d = data as Record<string, unknown>;

  return {
    id: toBigInt(d.id ?? d[0] ?? fallbackId ?? 0),
    renter: String(d.renter ?? d[1] ?? ""),
    availabilityId: toBigInt(d.availabilityId ?? d[2]),
    serialNumber: toBigInt(d.serialNumber ?? d[3]),
    startDate: toBigInt(d.startDate ?? d[4]),
    endDate: toBigInt(d.endDate ?? d[5]),
    totalPaid: toBigInt(d.totalPaid ?? d[6]),
    feeAmount: toBigInt(d.feeAmount ?? d[7]),
    ownerPayout: toBigInt(d.ownerPayout ?? d[8]),
    payoutClaimed: Boolean(d.payoutClaimed ?? d[9] ?? false),
    status: Number(d.status ?? d[10] ?? 0),
  };
}

/**
 * Parse availability data from SubscriptionMarketplace.getAvailability()
 * Struct order: id(0), owner(1), serialNumber(2), pricePerDay(3), windowStart(4), windowEnd(5), isActive(6)
 */
export function parseAvailability(data: unknown): ParsedAvailability | null {
  if (!data) return null;

  const d = data as Record<string, unknown>;

  return {
    id: toBigInt(d.id ?? d[0]),
    owner: String(d.owner ?? d[1] ?? ""),
    serialNumber: toBigInt(d.serialNumber ?? d[2]),
    pricePerDay: toBigInt(d.pricePerDay ?? d[3]),
    windowStart: toBigInt(d.windowStart ?? d[4]),
    windowEnd: toBigInt(d.windowEnd ?? d[5]),
    isActive: Boolean(d.isActive ?? d[6] ?? false),
  };
}

/**
 * Parse availability tuple from SubscriptionMarketplace.availabilities mapping.
 * Tuple order: [id, owner, serialNumber, windowStart, windowEnd, pricePerDay, status]
 * Note: This is the raw tuple format, different from the struct order.
 */
export function parseAvailabilityTuple(
  tuple: readonly [bigint, string, bigint, bigint, bigint, bigint, number] | undefined,
): ParsedAvailability | null {
  if (!tuple || tuple[0] === 0n) return null;

  return {
    id: tuple[0],
    owner: tuple[1],
    serialNumber: tuple[2],
    windowStart: tuple[3],
    windowEnd: tuple[4],
    pricePerDay: tuple[5],
    isActive: tuple[6] === 0,
  };
}
