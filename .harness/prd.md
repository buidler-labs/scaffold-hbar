# Extend Bridge: Bridge Architecture page

## Goal

This recipe **extends the existing Scaffold-HBAR bridge template** already present in this repository. Do **not** rebuild the template from scratch. Preserve the current Bridge UI, How it works modal, Debug Contracts route, and Foundry provider runbooks (Axelar / CCIP / LayerZero).

Add a public, read-only **Bridge Architecture** page that explains the LayerZero V2 OFT path between Ethereum Sepolia and Hedera Testnet, including the educational (non-production) nature of the contracts.

## Who It Is For

- Developers exploring the bridge template who want an in-app map of LayerZero + HTS connector mechanics
- Agents implementing a small, reviewable extension on top of a working Foundry + Next.js scaffold

## Existing app (preserve)

Keep these routes and behaviors working:

| Route | Purpose |
|-------|---------|
| `/` | Bridge — provider/direction/amount UI for Axelar, CCIP, and LayerZero |
| `/debug` | Debug Contracts |
| Header **How it works** | Existing `BridgeHowItWorksModal` |

Do not remove wallet connect, bridge hooks/services, Foundry LayerZero contracts (`MyOFT`, `HTSConnector` / `MyHTSConnectorOFT`, wire/send scripts), or other provider packages.

## Extension to implement

### Bridge Architecture page (`/architecture`)

Add a Next.js App Router page at `packages/nextjs/app/architecture/page.tsx` that:

1. Is readable **without** a connected wallet
2. Explains, in plain language:
   - **Paired OFTs**: Sepolia `MyOFT` peers with Hedera `MyHTSConnectorOFT` via LayerZero Endpoint V2 (`setPeer` both ways, EIDs not EVM chain IDs)
   - **HTS connector**: Hedera side creates an HTS fungible token (precompile `0x167`), burns on send (`_debit`), mints on receive (`_credit`); users must `approve` the connector and associate before inbound transfers
   - **Multi-network ops**: live bridge needs **both** Hedera testnet and Sepolia (RPC + funded EOAs); the `/architecture` page itself does not
   - **Educational disclaimer**: contracts/scripts/UI are learning aids — not audited, not production-ready, testnet-only; simple workers / UI `lzReceive` relay are educational, not production LayerZero verification
3. Includes a visible heading containing the exact text `How LayerZero bridging works on Hedera` (validators look for this string)
4. Includes short sections clearly labeled `Paired OFTs and peers`, `HTS connector on Hedera`, and `Educational testnet relay`

### Navigation

Add an **Architecture** item to the existing header menu (`packages/nextjs/components/Header.tsx` `menuLinks`) pointing at `/architecture`, consistent with Bridge / Debug Contracts.

## Non-goals

- No new Solidity contracts or LayerZero/HTS integration changes
- Do not add a Hardhat workspace
- No requirement for Sepolia/Hedera RPC, operator keys, or `.env` to open `/architecture` or build/lint
- No live LayerZero/on-chain validation in this recipe (gate 0–1 only)
- No redesign of the whole app; keep Scaffold-HBAR / DaisyUI patterns
- Do not switch the package manager away from Yarn
- Do not remove Axelar/CCIP runbooks or the existing How it works modal

## Deliverables

- `packages/nextjs/app/architecture/page.tsx` with the heading and sections above
- Header link to `/architecture`
- Frontend lint, Foundry compile, and production build still pass (`yarn next:lint`, `yarn foundry:compile`, `yarn next:build`)

## Acceptance (deterministic)

After the extension:

1. `packages/nextjs/app/architecture/page.tsx` exists
2. That file contains `How LayerZero bridging works on Hedera`, `Paired OFTs and peers`, `HTS connector on Hedera`, and `Educational testnet relay`
3. `Header.tsx` menu links include `/architecture`
4. Existing LayerZero patterns remain (`OFT` / `MyOFT`, HTS connector `_debit`/`_credit`, `setPeer` in `WireOApp.s.sol`)
5. `yarn next:lint`, `yarn foundry:compile`, and `yarn next:build` succeed
