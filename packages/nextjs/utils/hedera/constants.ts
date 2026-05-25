/**
 * Shared constants for the marketplace application.
 * Centralizes magic numbers and configuration values.
 */

// Time constants (SECONDS_PER_DAY is in dateUtils.ts)
export const PENDING_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
export const POLL_INTERVAL_MS = 3000; // 3 seconds

// Pagination
export const DEFAULT_PAGE_SIZE = 6;

// Gas limits for Hedera HTS operations
export const GAS_LIMITS = {
  MINT_SUBSCRIPTION: 1_500_000n,
  CREATE_AVAILABILITY: 800_000n,
  BOOK: 1_000_000n,
  CANCEL_BOOKING: 500_000n,
  CLAIM_PAYOUT: 500_000n,
  REMOVE_AVAILABILITY: 300_000n,
  CREATE_SALE_LISTING: 800_000n,
  BUY: 1_500_000n,
  BID: 800_000n,
  SETTLE: 1_500_000n,
  CANCEL_LISTING: 500_000n,
  APPROVE_NFT: 1_200_000n,
} as const;

// Addresses
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// Session storage keys
export const STORAGE_KEYS = {
  PENDING_SUBSCRIPTION: "pendingSubscription",
  PENDING_BOOKING: "pendingBooking",
} as const;

// Booking status enum (matches contract)
export enum BookingStatus {
  Active = 0,
  Completed = 1,
  Cancelled = 2,
}

// Availability status enum (matches contract)
export enum AvailabilityStatus {
  Active = 0,
  Removed = 1,
}

// Sales listing type enum (matches contract)
export enum SalesListingType {
  FixedPrice = 0,
  Auction = 1,
}

// Sales listing status enum (matches contract)
export enum SalesListingStatus {
  Active = 0,
  Sold = 1,
  Cancelled = 2,
}
