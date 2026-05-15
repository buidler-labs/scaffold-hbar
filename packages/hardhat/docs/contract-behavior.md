# Subscription Contracts Behavior

This document captures the intended runtime behavior for `SubscriptionNFT` and `SubscriptionMarketplace`.
It mirrors the NatSpec in the contracts so reviewers and contributors can reason about edge cases quickly.

## Time and Range Semantics

- All timestamps are Unix seconds.
- Day-aligned values mean midnight UTC (`timestamp % 1 days == 0`).
- Date windows use half-open intervals: `[start, end)`.
  - `start` is inclusive.
  - `end` is exclusive.
- A range is valid only when `start < end`.

## `SubscriptionNFT` Rules

- `createCollection` can be called only once by owner.
- `mintSubscription` requires:
  - collection already created,
  - non-empty `provider` and `serviceTier`,
  - valid range (`startDate < endDate`),
  - metadata length within `METADATA_MAX_BYTES`.
- Mint flow:
  1. Mint one NFT serial through HTS.
  2. Transfer minted serial from contract treasury to caller.
  3. Persist `SubscriptionData` in contract storage.
- `currentOwner` is authoritative from HTS ERC-721 compatibility (`ownerOf`), not from stored metadata.
- Expiry check in `isExpired` is strict: expired only when `block.timestamp > endDate`.

## `SubscriptionMarketplace` Rules

- Marketplace supports fixed-price booking only.
- `createAvailability` requires:
  - caller is current subscription owner,
  - day-aligned window bounds,
  - positive `pricePerDay`,
  - range inside subscription validity,
  - no overlap with other active availability windows for that serial.
- `book` requires:
  - active availability,
  - day-aligned `startDate`,
  - `numberOfDays > 0`,
  - booking range inside availability window,
  - no overlap with other active, non-expired bookings for that serial,
  - exact payment match.

## Ownership and Authorization

- Management authority always follows live NFT ownership (`subscriptionNFT.currentOwner(serial)`).
- A previous owner cannot continue managing listings or claiming payouts after transfer.
- Owner snapshots in storage are informational only and not used for authorization.

## Booking Lifecycle

- New bookings start as `Active`.
- Renter can cancel only before booking start (`block.timestamp < startDate`).
- Canceled bookings move to `Cancelled` and receive full refund.
- Expired active bookings are treated as non-blocking in overlap checks (`block.timestamp >= endDate`).

## Payout and Fee Flow

- Booking payment is escrowed in marketplace contract.
- Payout claim is allowed only when:
  - booking is active,
  - payout not yet claimed,
  - booking has started (`block.timestamp >= startDate`),
  - caller is current owner of the related subscription serial.
- On payout claim:
  - owner payout is transferred to caller,
  - marketplace fee is added to `accruedMarketplaceFees`,
  - booking is marked `payoutClaimed = true`.
- Protocol fees can be withdrawn only by marketplace owner.

## Read APIs

- `userOf(serial)` returns renter only when current time is inside an active booking range.
- `getBookings(serial)` and `getAvailability(serial)` return historical arrays in insertion order.

