# Extend Tokenise Subscriptions: Subscription Guide page

## Goal

This recipe **extends the existing NFT subscription marketplace** already present in this repository. Do **not** rebuild the template from scratch. Preserve the current Rentals, Sales, Mint, My Subscriptions, and My Bookings flows.

Add a public, read-only **Subscription Guide** page that explains how this demo uses Hedera Token Service (HTS) NFTs for rental and sales marketplace mechanics.

## Who It Is For

- Developers exploring SubRent who want an in-app explanation of rental vs sales flows
- Agents implementing a small, reviewable extension on top of a working HTS marketplace

## Existing app (preserve)

Keep these routes and behaviors working:

| Route | Purpose |
|-------|---------|
| `/` | Home — marketplace overview |
| `/marketplace` | Rentals — browse and book availability windows |
| `/sales` | Sales — fixed-price listings and auctions |
| `/mint` | Mint subscription NFTs |
| `/my-subscriptions` | Owned NFTs and listing creation |
| `/my-bookings` | Renter and owner booking views |
| `/debug` | Direct contract interaction |

Do not remove wallet connect, marketplace hooks, or existing Hardhat contracts (`SubscriptionNFT`, `SubscriptionMarketplace`, `SubscriptionSalesMarketplace`).

## Extension to implement

### Subscription Guide page (`/guide`)

Add a Next.js App Router page at `packages/nextjs/app/guide/page.tsx` that:

1. Is readable **without** a connected wallet
2. Explains, in plain language:
   - How subscriptions are **tokenized as HTS NFTs** (collection + mint via the HTS precompile at `0x167`)
   - The **rental** flow: list availability → book with HBAR escrow → `userOf` access rights (NFT stays with owner)
   - The **sales** flow: fixed-price or auction → ownership transfer → provider royalty + marketplace fee
3. Includes a visible heading containing the exact text `How subscription NFTs work on Hedera` (validators look for this string)
4. Includes short sections clearly labeled `Rental marketplace`, `Sales marketplace`, and `HTS tokenization`

### Navigation

Add a **Guide** item to the existing header menu (`packages/nextjs/components/Header.tsx` `menuLinks`) pointing at `/guide`, consistent with Rentals / Sales / My Subscriptions.

## Non-goals

- No new Solidity contracts or changes to HTS precompile integration
- Do not add a Foundry workspace
- No requirement for live operator keys or `.env` to open `/guide` or build/lint
- No redesign of the whole app; keep Scaffold-HBAR / DaisyUI patterns
- Do not switch the package manager away from Yarn

## Deliverables

- `packages/nextjs/app/guide/page.tsx` with the heading and sections above
- Header link to `/guide`
- Existing lint and production build still pass (`yarn lint`, `yarn next:build`)

## Acceptance (deterministic)

After the extension:

1. `packages/nextjs/app/guide/page.tsx` exists
2. That file contains `How subscription NFTs work on Hedera`, `Rental marketplace`, `Sales marketplace`, and `HTS tokenization`
3. `Header.tsx` menu links include `/guide`
4. Existing HTS patterns remain (`IHederaTokenService`, `DEFAULT_HTS` / `0x167` in `SubscriptionNFT.sol`)
5. `yarn lint` and `yarn next:build` succeed
