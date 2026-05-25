# SubRent - Subscription NFT Marketplace

A Hedera-ready monorepo for building dApps with **Next.js**, **Hardhat**, and Hedera networks (testnet, mainnet). This repository is the source for [create-scaffold-hbar](https://github.com/buidler-labs/create-scaffold-hbar) templates; it uses the **Hardhat** stack and ships the **nft-subscription-marketplace** pattern: tokenize subscriptions (gym memberships, WiFi access, streaming services, etc.) as HTS NFTs and rent out unused periods to others.

## Disclaimer

This template—including **contracts, frontend, and tooling**—is **experimental** and **not audited**. Do not use it in production without proper security review and your own due diligence.

## How It Works

### Rental Marketplace

1. **Tokenize** - Mint your subscription as an NFT with provider, tier, and validity dates
2. **List** - Create availability windows for periods you won't use, set a daily price
3. **Rent** - Others book your listed periods, paying HBAR into escrow
4. **Earn** - Claim payouts after booking periods start (marketplace takes 5% fee)

The NFT stays with the owner throughout. Booking creates an on-chain **access-right record** — `userOf(serialNumber)` returns who currently has rental rights.

### Sales Marketplace

1. **List for Sale** - Create a fixed-price listing or start an English auction (3-day duration)
2. **Buy/Bid** - Others can buy immediately or place bids on auctions
3. **Transfer** - NFT ownership transfers to the buyer, seller receives payment (minus fees)
4. **Provider Royalty** - 5% of sale price goes to the original service provider

**Fee Structure on Sales:**

- 5% Provider Royalty (goes to original minter/provider)
- 5% Marketplace Fee
- 90% goes to the seller

## Architecture

```
┌─────────────────────┐     ┌──────────────────────────┐     ┌───────────────────────────────┐
│  SubscriptionNFT    │     │  SubscriptionMarketplace │     │  SubscriptionSalesMarketplace │
│  ─────────────────  │     │  ──────────────────────  │     │  ───────────────────────────  │
│  • createCollection │◄────│  • createAvailability    │     │  • createFixedPriceListing    │
│  • mintSubscription │     │  • book (escrow HBAR)    │◄────│  • createAuction              │
│  • getSubscription  │     │  • userOf (rental check) │     │  • buy / bid                  │
│  • currentOwner     │     │  • claimBookingPayout    │     │  • settleAuction              │
│  • providerAddress  │     │  • hasActiveFutureBookings│     │  • 5% provider royalty        │
└─────────────────────┘     └──────────────────────────┘     └───────────────────────────────┘
         │                              │                                    │
         └──────────┬───────────────────┴────────────────────────────────────┘
                    ▼
           ┌────────────────┐
           │  HTS Precompile │
           │    (0x167)      │
           └────────────────┘
```

## Prerequisites

Before you begin, make sure you have the following installed:

1. **Node.js** (v20.18.3 or higher)
  - Download from [nodejs.org](https://nodejs.org/) or use [nvm](https://github.com/nvm-sh/nvm)
  - Verify: `node --version`
2. **Yarn** (package manager)
  - Install via npm: `npm install -g yarn`
  - Verify: `yarn --version`
3. **Git**
  - Download from [git-scm.com](https://git-scm.com/)
  - Verify: `git --version`
4. **A Hedera-compatible wallet** (for using the frontend)
  - [MetaMask](https://metamask.io/) or [HashPack](https://www.hashpack.app/)

## Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd scaffold-hbar

# Install all dependencies
yarn install
```

### 2. Configure Environment (Optional)

The project comes with sensible defaults, but you can customize:

**Hardhat** (`packages/hardhat/.env`):

```bash
cp packages/hardhat/.env.example packages/hardhat/.env
# Edit if you need a different RPC endpoint
```

**Frontend** (`packages/nextjs/.env`):

```bash
cp packages/nextjs/.env.example packages/nextjs/.env
# Optional: Add WalletConnect project ID for better wallet support
# Get one free at https://cloud.walletconnect.com/
```

### 3. Set Up Deployer Account

Generate an encrypted wallet for deploying contracts:

```bash
yarn hardhat:account:generate
```

You'll be prompted to create a password. Save this password securely—you'll need it for deployments.

View your new deployer address:

```bash
yarn hardhat:account
```

**Fund your deployer address** with testnet HBAR:

1. Copy your deployer address from the output above
2. Go to [Hedera Portal Faucet](https://portal.hedera.com/faucet)
3. Paste your address and request testnet HBAR (you'll need ~50 HBAR for deployment + collection creation)

### 4. Deploy Contracts to Hedera Testnet

Once your account is funded:

```bash
yarn hardhat:deploy --network hederaTestnet
```

Enter your wallet password when prompted. This deploys two contracts:

- `SubscriptionNFT` - Manages HTS NFT minting
- `SubscriptionMarketplace` - Handles bookings and escrow

Contract addresses are automatically saved to `packages/nextjs/contracts/deployedContracts.ts`.

### 5. Initialize the NFT Collection

Create the HTS token collection (required before minting any NFTs):

```bash
cd packages/hardhat
npx ts-node scripts/createCollection.ts
```

This calls `createCollection()` and pays ~40 HBAR for HTS token creation fees.

### 6. Start the Frontend

Return to the project root and start the development server:

```bash
cd ..  # Go back to project root if you're in packages/hardhat
yarn start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 7. Connect Your Wallet to the Frontend

To interact with the marketplace, connect a wallet:

**Option A: MetaMask**

1. Install [MetaMask browser extension](https://metamask.io/)
2. Add Hedera Testnet network:
  - Network Name: `Hedera Testnet`
  - RPC URL: `https://testnet.hashio.io/api`
  - Chain ID: `296`
  - Currency Symbol: `HBAR`
  - Explorer: `https://hashscan.io/testnet`
3. Import or create an account and fund it via the [faucet](https://portal.hedera.com/faucet)

**Option B: HashPack**

1. Install [HashPack](https://www.hashpack.app/)
2. Create or import a Hedera testnet account
3. Fund via the [faucet](https://portal.hedera.com/faucet)

### 8. Use the Marketplace

With your wallet connected at [http://localhost:3000](http://localhost:3000):

1. **Mint a Subscription** (`/mint`) - Create an NFT representing your subscription
2. **My Subscriptions** (`/my-subscriptions`) - View your NFTs, create rental or sale listings
3. **Rentals** (`/marketplace`) - Browse and book available rental listings
4. **Sales** (`/sales`) - Browse, buy, or bid on subscriptions for sale
5. **My Bookings** (`/my-bookings`) - View your rentals and claim payouts

## Optional: Run the Test Flow Script

To see the full flow working end-to-end via scripts (after steps 1-4):

```bash
cd packages/hardhat
npx ts-node scripts/testFullFlow.ts
```

This demonstrates:

1. Minting a subscription NFT ("Gym A - Premium", 90-day validity)
2. Creating an availability listing (14-day window, 1 HBAR/day)
3. Booking a 3-day rental period (pays 3 HBAR)
4. Verifying `userOf()` returns the renter during the booking period

## Important: Hedera Value Handling

Hedera's EVM has a quirk with `msg.value`:


| Context               | Unit                  | 1 HBAR equals |
| --------------------- | --------------------- | ------------- |
| JSON-RPC (sending tx) | wei                   | 10^18         |
| Contract `msg.value`  | tinybars              | 10^8          |
| Conversion            | 1 tinybar = 10^10 wei |               |


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


| Function                                                        | Description                                            |
| --------------------------------------------------------------- | ------------------------------------------------------ |
| `createCollection(name, symbol, memo)`                          | Owner creates HTS NFT collection (once, requires HBAR) |
| `mintSubscription(providerAddress, provider, tier, start, end)` | Mint subscription NFT to caller with royalty recipient |
| `getSubscription(serialNumber)`                                 | Get subscription metadata                              |
| `getProviderAddress(serialNumber)`                              | Get royalty recipient address                          |
| `currentOwner(serialNumber)`                                    | Get current NFT owner via HTS                          |
| `isExpired(serialNumber)`                                       | Check if subscription has expired                      |


### SubscriptionMarketplace (Rentals)


| Function                                              | Description                                |
| ----------------------------------------------------- | ------------------------------------------ |
| `createAvailability(serial, start, end, pricePerDay)` | List rental window (owner only)            |
| `book(availabilityId, startDate, days)`               | Book and pay (escrows HBAR)                |
| `userOf(serialNumber)`                                | Returns active renter or zero address      |
| `cancelBooking(bookingId)`                            | Cancel before start for full refund        |
| `claimBookingPayout(bookingId)`                       | Owner claims payment after start           |
| `hasActiveFutureBookings(serialNumber)`               | Check if serial has future bookings (view) |


### SubscriptionSalesMarketplace (Sales)


| Function                                 | Description                                           |
| ---------------------------------------- | ----------------------------------------------------- |
| `createFixedPriceListing(serial, price)` | List NFT for immediate sale                           |
| `createAuction(serial, reservePrice)`    | Start 3-day English auction                           |
| `buy(listingId)`                         | Buy fixed-price listing                               |
| `bid(listingId)`                         | Place bid on auction (payable)                        |
| `settleAuction(listingId)`               | Settle ended auction (transfer NFT, distribute funds) |
| `cancelListing(listingId)`               | Cancel listing (no bids for auction)                  |
| `getMinimumBid(listingId)`               | Get minimum required bid for auction                  |


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

## Development

For active development with hot reload:

```bash
# Terminal 1: Start frontend in dev mode
yarn next:dev
```

The app will be available at [http://localhost:3000](http://localhost:3000) with hot reloading enabled.

### Useful Commands

```bash
# Compile contracts
yarn hardhat:compile

# Run contract tests
yarn hardhat:test

# Lint code
yarn lint

# Format code
yarn format

# Build frontend for production
yarn next:build

# Verify contracts on Hashscan
yarn hardhat:verify:testnet
```

## Project Structure

```
packages/
├── hardhat/
│   ├── contracts/
│   │   ├── SubscriptionNFT.sol              # HTS NFT minting & metadata
│   │   ├── SubscriptionMarketplace.sol      # Rental bookings, escrow & payouts
│   │   ├── SubscriptionSalesMarketplace.sol # Sales: fixed-price & auctions
│   │   └── interfaces/                      # HTS precompile interfaces
│   ├── deploy/                              # Hardhat deployment scripts
│   ├── tasks/                               # Custom Hardhat tasks (sales:*)
│   ├── scripts/
│   │   ├── createCollection.ts              # Initialize HTS collection
│   │   └── testFullFlow.ts                  # End-to-end test script
│   └── test/                                # Unit tests with MockHTS
└── nextjs/
    ├── app/
    │   ├── page.tsx                         # Home page
    │   ├── mint/                            # Mint new subscription NFTs
    │   ├── marketplace/                     # Browse & book rental listings
    │   ├── sales/                           # Browse, buy, or bid on sales
    │   ├── my-subscriptions/                # View owned NFTs, create listings
    │   ├── my-bookings/                     # Renter & owner booking views
    │   └── debug/                           # Direct contract interaction UI
    ├── components/marketplace/              # Reusable marketplace components
    ├── hooks/
    │   ├── marketplace/                     # Rental marketplace hooks
    │   └── sales/                           # Sales marketplace hooks
    ├── utils/hedera/                        # Hedera-specific utilities
    └── contracts/deployedContracts.ts       # Auto-generated ABIs & addresses
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

