# Extend Cross-Chain DCA: Cross-Chain Flow page

## Goal

This recipe **extends the existing cross-chain DCA app** already present in this repository. Do **not** rebuild the template from scratch. Preserve the current Home, Cross-Chain DCA, Debug Contracts, and Block Explorer flows.

Add a public, read-only **Cross-Chain Flow** page that explains the Hedera → Axelar GMP → Sepolia Uniswap path.

## Who It Is For

- Developers exploring the template who want an in-app map of the multi-network architecture
- Agents implementing a small, reviewable extension on top of a working Hardhat + Next.js scaffold

## Existing app (preserve)

Keep these routes and behaviors working:

| Route | Purpose |
|-------|---------|
| `/` | Home — template landing |
| `/dca` | Cross-Chain DCA — create/cancel plans, execution log |
| `/debug` | Debug Contracts |
| `/blockexplorer` | Local block explorer |

Do not remove wallet connect, DCA UI, or Hardhat contracts (`DcaOrchestrator`, `AxelarMessageSender`, `AxelarMessageReceiver`, `DcaExecutor`).

## Extension to implement

### Cross-Chain Flow page (`/flow`)

Add a Next.js App Router page at `packages/nextjs/app/flow/page.tsx` that:

1. Is readable **without** a connected wallet
2. Explains, in plain language:
   - **Hedera orchestration**: `DcaOrchestrator` + Hedera Schedule Service (`0x16b`) self-reschedules `executeDca`
   - **Axelar GMP**: `AxelarMessageSender` pays gas then `gateway.callContract` to Sepolia
   - **Sepolia execution**: `AxelarMessageReceiver` allowlists the Hedera sender, then `DcaExecutor` swaps via Uniswap v3
   - That live deploys need **both** Hedera testnet and Sepolia (RPC + funded accounts); the `/flow` page itself does not
3. Includes a visible heading containing the exact text `How cross-chain DCA flows on Hedera` (validators look for this string)
4. Includes short sections clearly labeled `Hedera orchestration`, `Axelar GMP`, and `Sepolia execution`

### Navigation

Add a **Flow** item to the existing header menu (`packages/nextjs/components/Header.tsx` `menuLinks`) pointing at `/flow`, consistent with Cross-Chain DCA / Debug Contracts.

## Non-goals

- No new Solidity contracts or bridge/HSS integration changes
- Do not add a Foundry workspace
- No requirement for Sepolia RPC, operator keys, or `.env` to open `/flow` or build/lint
- No live Axelar/on-chain validation in this recipe (gate 0–1 only)
- No redesign of the whole app; keep Scaffold-HBAR / DaisyUI patterns
- Do not switch the package manager away from Yarn

## Deliverables

- `packages/nextjs/app/flow/page.tsx` with the heading and sections above
- Header link to `/flow`
- Existing lint and production build still pass (`yarn lint`, `yarn next:build`)

## Acceptance (deterministic)

After the extension:

1. `packages/nextjs/app/flow/page.tsx` exists
2. That file contains `How cross-chain DCA flows on Hedera`, `Hedera orchestration`, `Axelar GMP`, and `Sepolia execution`
3. `Header.tsx` menu links include `/flow`
4. Existing Axelar + HSS patterns remain (`callContract`, `payNativeGasForContractCall`, `0x16b` / `scheduleCall` in orchestrator/sender)
5. `yarn lint` and `yarn next:build` succeed
