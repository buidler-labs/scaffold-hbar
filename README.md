# SubRent - Subscription NFT Marketplace

A decentralized marketplace on Hedera where users tokenize subscriptions (gym memberships, WiFi access, streaming services, etc.) as HTS NFTs and rent out unused periods to others.

## How It Works

1. **Tokenize** - Mint your subscription as an NFT with provider, tier, and validity dates
2. **List** - Create availability windows for periods you won't use, set a daily price
3. **Rent** - Others book your listed periods, paying HBAR into escrow
4. **Earn** - Claim payouts after booking periods start (marketplace takes 5% fee)

The NFT stays with the owner throughout. Booking creates an on-chain **access-right record** — `userOf(serialNumber)` returns who currently has rental rights.

## Architecture

```
┌─────────────────────┐     ┌──────────────────────────┐
│  SubscriptionNFT    │     │  SubscriptionMarketplace │
│  ─────────────────  │     │  ──────────────────────  │
│  • createCollection │◄────│  • createAvailability    │
│  • mintSubscription │     │  • book (escrow HBAR)    │
│  • getSubscription  │     │  • userOf (rental check) │
│  • currentOwner     │     │  • claimBookingPayout    │
└─────────────────────┘     └──────────────────────────┘
         │                              │
         └──────────┬───────────────────┘
                    ▼
           ┌────────────────┐
           │  HTS Precompile │
           │    (0x167)      │
           └────────────────┘
```

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20.18.3
- [Yarn](https://yarnpkg.com/)
- Hedera testnet account with HBAR ([Faucet](https://portal.hedera.com/faucet))

## Quick Start

### 1. Install Dependencies

```bash
yarn install
```

### 2. Set Up Deployer Account

```bash
cd packages/hardhat
yarn account:generate    # Creates encrypted deployer wallet
yarn account             # Shows address and balances
```

Fund your deployer address with testnet HBAR from the [Hedera Portal Faucet](https://portal.hedera.com/faucet).

### 3. Deploy to Hedera Testnet

```bash
yarn hardhat:deploy --network hederaTestnet
```

You'll be prompted for your wallet password. This deploys:
- `SubscriptionNFT` - HTS NFT collection manager
- `SubscriptionMarketplace` - Booking and escrow system

### 4. Initialize the NFT Collection

After deployment, create the HTS token collection:

```bash
cd packages/hardhat
npx ts-node scripts/createCollection.ts
```

This calls `createCollection()` on the SubscriptionNFT contract with ~40 HBAR to cover HTS token creation fees.

### 5. Run the Full Test Flow

```bash
npx ts-node scripts/testFullFlow.ts
```

This script demonstrates the complete flow:
1. Mint a subscription NFT ("Gym A - Premium", 90-day validity)
2. Create an availability listing (14-day window, 1 HBAR/day)
3. Book a 3-day rental period (pays 3 HBAR)
4. Verify `userOf()` returns the renter during booking period

### 6. Start the Frontend

```bash
yarn next:start
```

Open [http://localhost:3000/debug](http://localhost:3000/debug) to interact with contracts via the Debug UI.

## Important: Hedera Value Handling

Hedera's EVM has a quirk with `msg.value`:

| Context | Unit | 1 HBAR equals |
|---------|------|---------------|
| JSON-RPC (sending tx) | wei | 10^18 |
| Contract `msg.value` | tinybars | 10^8 |
| Conversion | 1 tinybar = 10^10 wei | |

**When storing prices in contracts**, use **tinybars** (8 decimals):

```javascript
// Storing 1 HBAR price
const pricePerDay = ethers.parseUnits("1", 8);  // 100000000 tinybars

// Sending 3 HBAR payment via JSON-RPC
const costTinybars = pricePerDay * 3n;           // 300000000 tinybars
const costWei = costTinybars * BigInt(10 ** 10); // 3000000000000000000 wei
await contract.book(..., { value: costWei });
```

## Contract Functions

### SubscriptionNFT

| Function | Description |
|----------|-------------|
| `createCollection(name, symbol, memo)` | Owner creates HTS NFT collection (once, requires HBAR) |
| `mintSubscription(provider, tier, startDate, endDate)` | Mint subscription NFT to caller |
| `getSubscription(serialNumber)` | Get subscription metadata |
| `currentOwner(serialNumber)` | Get current NFT owner via HTS |
| `isExpired(serialNumber)` | Check if subscription has expired |

### SubscriptionMarketplace

| Function | Description |
|----------|-------------|
| `createAvailability(serial, start, end, pricePerDay)` | List rental window (owner only) |
| `book(availabilityId, startDate, days)` | Book and pay (escrows HBAR) |
| `userOf(serialNumber)` | Returns active renter or zero address |
| `cancelBooking(bookingId)` | Cancel before start for full refund |
| `claimBookingPayout(bookingId)` | Owner claims payment after start |

## Deployed Contracts (Testnet)

After deployment, addresses are saved in `packages/nextjs/contracts/deployedContracts.ts`.

View on Hashscan:
- SubscriptionNFT: Check `deployedContracts.ts` for address
- SubscriptionMarketplace: Check `deployedContracts.ts` for address

## Testing

### Unit Tests (Fast, Local)

```bash
cd packages/hardhat
yarn test
```

Uses `MockHTS` to simulate Hedera Token Service locally.

### Forked Tests (Against Testnet)

```bash
yarn test:forking
```

## Project Structure

```
packages/
├── hardhat/
│   ├── contracts/
│   │   ├── SubscriptionNFT.sol        # HTS NFT minting
│   │   ├── SubscriptionMarketplace.sol # Booking system
│   │   └── interfaces/IHederaTokenService.sol
│   ├── deploy/                         # Deployment scripts
│   ├── scripts/
│   │   ├── createCollection.ts         # Initialize HTS collection
│   │   └── testFullFlow.ts             # End-to-end test
│   └── test/                           # Unit tests
└── nextjs/
    ├── app/
    │   ├── debug/                      # Contract interaction UI
    │   └── blockexplorer/              # Local tx explorer
    └── contracts/deployedContracts.ts  # Auto-generated ABIs
```

## Troubleshooting

### "INVALID_FULL_PREFIX_SIGNATURE_FOR_PRECOMPILE" (Error 326)

The contract needs `delegatableContractId` (not `contractId`) for HTS authorization. Also ensure `autoRenewAccount` is set to `address(this)`.

### "IncorrectPayment" on booking

Check that prices are stored in **tinybars** (8 decimals), and payments sent via JSON-RPC are in **wei** (18 decimals). See the value handling section above.

### "HtsCreateFailed(9)" on createCollection

Insufficient HBAR sent for token creation. Send at least 40 HBAR with the transaction.

## Links

- [Hedera Documentation](https://docs.hedera.com/)
- [Hashscan Explorer](https://hashscan.io/testnet)
- [HTS Precompile Reference](https://docs.hedera.com/hedera/core-concepts/smart-contracts/hedera-token-service-hts-precompiled-contract)
- [Hedera Portal Faucet](https://portal.hedera.com/faucet)
