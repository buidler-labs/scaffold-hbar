# Extend Oracles Template: Oracle Comparison page

## Goal

This recipe **extends the existing Hedera oracles app** already present in this repository. Do **not** rebuild the template from scratch. Preserve the current Oracles dashboard and Debug Contracts flows.

Add a public, read-only **Oracle Comparison** page that explains how Chainlink, Supra, and Pyth adapters share the `IPriceOracle` interface and normalize prices to 18 decimals.

## Who It Is For

- Developers exploring the oracles starter who want an in-app comparison of providers
- Agents implementing a small, reviewable extension on top of a working Foundry + Next.js oracle scaffold

## Existing app (preserve)

Keep these routes and behaviors working:

| Route | Purpose |
|-------|---------|
| `/` | Oracles dashboard — provider status, quotes, deployment guides |
| `/debug` | Debug Contracts — interact with deployed contracts |

Do not remove wallet connect, oracle dashboard components, or Foundry contracts (`IPriceOracle`, `ChainlinkPriceOracleAdapter`, `SupraPriceOracleAdapter`, `PythPriceOracleAdapter`, `OracleConsumer`).

## Extension to implement

### Oracle Comparison page (`/compare`)

Add a Next.js App Router page at `packages/nextjs/app/compare/page.tsx` that:

1. Is readable **without** a connected wallet
2. Explains, in plain language:
   - The shared **`IPriceOracle`** shape (`latestPrice` → `priceE18`, `updatedAt`, pair/provider keys)
   - How **Chainlink** maps pair keys to Data Feed addresses and validates rounds
   - How **Supra** maps pair keys to push-oracle pair IDs (USDT pairs on Hedera; ms timestamps)
   - How **Pyth** is a pull oracle (`updatePrice` with Hermes payloads before fresh reads)
   - That consumers switch providers with `OracleConsumer.setOracle` without changing conversion logic
3. Includes a visible heading containing the exact text `Compare oracle providers on Hedera` (validators look for this string)
4. Includes short sections clearly labeled `Shared IPriceOracle interface`, `Chainlink adapter`, `Supra adapter`, and `Pyth adapter`

### Navigation

Add a **Compare** item to the existing header menu (`packages/nextjs/components/Header.tsx` `menuLinks`) pointing at `/compare`, consistent with Oracles / Debug Contracts.

## Non-goals

- No new Solidity contracts or changes to adapter/precompile integrations
- Do not add a Hardhat workspace
- No requirement for live operator keys or `.env` to open `/compare` or build/lint
- No redesign of the whole app; keep Scaffold-HBAR / DaisyUI patterns
- Do not switch the package manager away from Yarn

## Deliverables

- `packages/nextjs/app/compare/page.tsx` with the heading and sections above
- Header link to `/compare`
- Frontend lint, Foundry compile, and production build still pass (`yarn next:lint`, `yarn foundry:compile`, `yarn next:build`) after Forge submodules are initialized

## Acceptance (deterministic)

After the extension:

1. `packages/nextjs/app/compare/page.tsx` exists
2. That file contains `Compare oracle providers on Hedera`, `Shared IPriceOracle interface`, `Chainlink adapter`, `Supra adapter`, and `Pyth adapter`
3. `Header.tsx` menu links include `/compare`
4. Existing oracle patterns remain (`IPriceOracle`, `latestPrice`, `priceE18`, and the three adapter contracts)
5. `git submodule update --init --recursive`, `yarn next:lint`, `yarn foundry:compile`, and `yarn next:build` succeed
