# Extend x402 Pay-Per-Use: How x402 Works page

## Goal

This recipe **extends the existing x402 pay-per-use marketplace** already present in this repository. Do **not** rebuild the template from scratch. Preserve the current Home, Marketplace, Upload, file detail, Debug Contracts, and Block Explorer flows, plus MinIO/facilitator Docker infra.

Add a public, read-only **How x402 Works** page that explains FileRegistry metadata, the HTTP 402 payment loop, and the self-hosted Hedera facilitator.

## Who It Is For

- Developers exploring the template who want an in-app map of pay-per-download mechanics
- Agents implementing a small, reviewable extension on top of a working Hardhat + Next.js + Docker scaffold

## Existing app (preserve)

Keep these routes and behaviors working:

| Route | Purpose |
|-------|---------|
| `/` | Home — template landing |
| `/files` | Marketplace — list registered files |
| `/files/upload` | Upload to MinIO + register on `FileRegistry` |
| `/files/[id]` | File detail — public or paid download |
| `/debug` | Debug Contracts |
| `/blockexplorer` | Local block explorer |

Do not remove HashPack wallet connect, x402 client/server services, `FileRegistry`, `docker-compose.yml`, or `yarn infra:*` scripts.

## Extension to implement

### How x402 Works page (`/how-it-works`)

Add a Next.js App Router page at `packages/nextjs/app/how-it-works/page.tsx` that:

1. Is readable **without** a connected wallet and **without** Docker/MinIO running
2. Explains, in plain language:
   - **FileRegistry**: on-chain terms (`payToAccountId`, `priceTinybar`, `isPublic`, `objectKey`) — bytes stay in private MinIO; asset id `0.0.0` (HBAR tinybars)
   - **HTTP 402 loop**: private download → `PAYMENT-REQUIRED` → buyer signs → retry with `PAYMENT-SIGNATURE` → resource server `verifyPayment` / `settlePayment` → short-lived URL
   - **Facilitator**: self-hosted verify/settle with ECDSA fee-payer; Next.js never holds `FACILITATOR_PRIVATE_KEY`; local infra via `yarn infra:up` (Docker)
3. Includes a visible heading containing the exact text `How x402 payments work on Hedera` (validators look for this string)
4. Includes short sections clearly labeled `FileRegistry metadata`, `HTTP 402 payment loop`, and `Self-hosted facilitator`

### Navigation

Add a **How it works** item to the existing header menu (`packages/nextjs/components/Header.tsx` `menuLinks`) pointing at `/how-it-works`, consistent with Marketplace / Upload.

## Non-goals

- No new Solidity contracts or x402/facilitator integration changes
- Do not add a Foundry workspace
- Do **not** forbid Docker — this template needs Compose for MinIO + facilitator
- No requirement for facilitator keys, MinIO, or `.env` to open `/how-it-works` or build/lint
- No live paid-download / on-chain settlement validation in this recipe (gate 0–1 only)
- No redesign of the whole app; keep Scaffold-HBAR / DaisyUI patterns
- Do not switch the package manager away from Yarn

## Deliverables

- `packages/nextjs/app/how-it-works/page.tsx` with the heading and sections above
- Header link to `/how-it-works`
- Existing lint and production build still pass (`yarn lint`, `yarn next:build`)

## Acceptance (deterministic)

After the extension:

1. `packages/nextjs/app/how-it-works/page.tsx` exists
2. That file contains `How x402 payments work on Hedera`, `FileRegistry metadata`, `HTTP 402 payment loop`, and `Self-hosted facilitator`
3. `Header.tsx` menu links include `/how-it-works`
4. Existing x402 patterns remain (`FileRegistry.registerFile`, `ExactHederaScheme`, `PAYMENT-REQUIRED`, `verifyPayment` / `settlePayment`)
5. `yarn lint` and `yarn next:build` succeed
