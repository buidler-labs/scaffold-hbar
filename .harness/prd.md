# Extend Hedera Demo: Learn page

## Goal

This recipe **extends the existing Hedera-native Proof Wall app** already present in this repository. Do **not** rebuild the template from scratch. Preserve the current Proof Wall, Admin, and My Proofs flows.

Add a public, read-only **Learn** page that explains how this demo uses Hedera Consensus Service (HCS) and Hedera Token Service (HTS) for newcomers.

## Who It Is For

- Developers exploring the scaffolded demo who want an in-app explanation of HCS/HTS
- Agents implementing a small, reviewable extension on top of a working app

## Existing app (preserve)

Keep these routes and behaviors working:

| Route | Purpose |
|-------|---------|
| `/` | Proof Wall — browse/submit HCS messages |
| `/admin` | Create HCS topic and HTS badge/token |
| `/my-proofs` | Wallet-specific proofs and badge state |

Do not remove wallet connect, topic selector, or existing Hedera API routes.

## Extension to implement

### Learn page (`/learn`)

Add a Next.js App Router page at `packages/nextjs/app/learn/page.tsx` that:

1. Is readable **without** a connected wallet
2. Explains, in plain language:
   - What the Proof Wall stores on **HCS**
   - What the participant **HTS badge/token** represents
   - That live writes need a funded Hedera testnet account, while browse/build do not
3. Includes a visible heading containing the exact text `How this demo uses Hedera` (validators look for this string)
4. Includes short sections clearly labeled `Consensus Service (HCS)` and `Token Service (HTS)`

### Navigation

Add a **Learn** item to the existing header menu (`packages/nextjs/components/Header.tsx` `menuLinks`) pointing at `/learn`, consistent with Proof Wall / My Proofs / Admin.

## Non-goals

- No new Solidity / Hardhat / Foundry workspaces
- No requirement for live operator keys or `.env` to open `/learn` or build/lint
- No redesign of the whole app; keep Scaffold-HBAR / DaisyUI patterns
- Do not switch the package manager away from Yarn

## Deliverables

- `packages/nextjs/app/learn/page.tsx` with the heading and HCS/HTS sections above
- Header link to `/learn`
- Existing lint and production build still pass (`yarn lint`, `yarn next:build`)

## Acceptance (deterministic)

After the extension:

1. `packages/nextjs/app/learn/page.tsx` exists
2. That file contains `How this demo uses Hedera`, `Consensus Service (HCS)`, and `Token Service (HTS)`
3. `Header.tsx` menu links include `/learn`
4. `yarn lint` and `yarn next:build` succeed
