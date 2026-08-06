# Extend Payments Scheduler: DCA Explainer page

## Goal

This recipe **extends the existing payments-scheduler app** already present in this repository. Do **not** rebuild the template from scratch. Preserve the current DCA vault UI and Debug Contracts flows.

Add a public, read-only **DCA Explainer** page that explains how ScheduledVault uses Hedera Schedule Service (HSS) for recurring DCA execution.

## Who It Is For

- Developers exploring the payments-scheduler starter who want an in-app explanation of HSS scheduling
- Agents implementing a small, reviewable extension on top of a working Foundry + Next.js scaffold

## Existing app (preserve)

Keep these routes and behaviors working:

| Route | Purpose |
|-------|---------|
| `/` | DCA — create vault, deposit, schedule controls (Memejob example) |
| `/debug` | Debug Contracts — interact with deployed contracts |
| `/blockexplorer` | Local block explorer |

Do not remove wallet connect, DCA components (`CreateVaultCard`, `DepositSection`, `ScheduleControls`, etc.), or Foundry contracts (`ScheduledVault`, `ScheduledVaultFactory`, strategies).

## Extension to implement

### DCA Explainer page (`/dca-guide`)

Add a Next.js App Router page at `packages/nextjs/app/dca-guide/page.tsx` that:

1. Is readable **without** a connected wallet
2. Explains, in plain language:
   - What **ScheduledVault** does (custody + configure strategy + schedule next run)
   - How **Hedera Schedule Service (HSS)** at `0x16b` schedules `executeScheduled` via `scheduleCall`
   - The **reschedule loop**: HSS fires → strategy `plan()` runs → vault schedules the next expiry
   - That real schedule execution needs **Hedera testnet/mainnet** (not local forks)
3. Includes a visible heading containing the exact text `How DCA scheduling works on Hedera` (validators look for this string)
4. Includes short sections clearly labeled `ScheduledVault`, `Hedera Schedule Service (HSS)`, and `DCA strategy pattern`

### Navigation

Add a **DCA Guide** item to the existing header menu (`packages/nextjs/components/Header.tsx` `menuLinks`) pointing at `/dca-guide`, consistent with DCA / Debug Contracts.

## Non-goals

- No new Solidity contracts or changes to HSS precompile integration
- Do not add a Hardhat workspace
- No requirement for live operator keys or `.env` to open `/dca-guide` or build/lint
- No redesign of the whole app; keep Scaffold-HBAR / DaisyUI patterns
- Do not switch the package manager away from Yarn

## Deliverables

- `packages/nextjs/app/dca-guide/page.tsx` with the heading and sections above
- Header link to `/dca-guide`
- Frontend lint, Foundry compile, and production build still pass (`yarn next:lint`, `yarn foundry:compile`, `yarn next:build`)

## Acceptance (deterministic)

After the extension:

1. `packages/nextjs/app/dca-guide/page.tsx` exists
2. That file contains `How DCA scheduling works on Hedera`, `ScheduledVault`, `Hedera Schedule Service (HSS)`, and `DCA strategy pattern`
3. `Header.tsx` menu links include `/dca-guide`
4. Existing HSS patterns remain (`IHederaScheduleService`, `scheduleCall`, HSS at `0x16b` in `ScheduledVault.sol`)
5. `yarn next:lint`, `yarn foundry:compile`, and `yarn next:build` succeed
