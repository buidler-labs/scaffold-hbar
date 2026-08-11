# Hedera Oracle Template

A Hedera oracle dApp template with Foundry smart contracts and a Next.js frontend.

The template includes:

- Foundry contracts, deploy scripts, account tooling, and tests in `packages/foundry`.
- A Next.js app with RainbowKit, wagmi, viem, and Scaffold-HBAR UI components in `packages/nextjs`.
- Provider adapter flows for Chainlink, Supra, and Pyth.
- Frontend contract metadata generated from `packages/foundry/deployments/<chainId>.json`.

## Overview

The contract side provides a provider-agnostic oracle pattern:

```text
Provider feed -> Multi-pair provider adapter -> OracleConsumer demo
```

Each provider adapter normalizes upstream prices into one shared `IPriceOracle` interface. The demo consumer stores
one selected adapter and can be switched to another provider after deployment.

For architecture details, provider limitations, and package-level commands, see
[`packages/foundry/README.md`](packages/foundry/README.md).

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20.18.3
- [Yarn](https://yarnpkg.com/) via Corepack:

  ```bash
  corepack enable && corepack prepare yarn@stable --activate
  ```

- [Git](https://git-scm.com/)
- [Foundry](https://book.getfoundry.sh/getting-started/installation) (`forge`, `cast`)
- A Hedera-created and funded account for testnet/mainnet deploys

## Quick Start

Install dependencies and initialize Forge submodules:

```bash
yarn install
git submodule update --init --recursive
```

Create or import a Foundry keystore account:

```bash
yarn foundry:account:generate
# or
yarn foundry:account:import
```

Fund that Hedera account with testnet HBAR from the [Hedera Portal faucet](https://portal.hedera.com/faucet).

Compile contracts and run the default unit tests:

```bash
yarn foundry:compile
yarn foundry:test
```

Run the frontend:

```bash
yarn next:dev
# or
yarn next:start
```

Open [http://localhost:3000](http://localhost:3000).

## Run with hedera-harness

This template ships a co-versioned [hedera-harness](https://www.npmjs.com/package/hedera-harness) recipe under `.harness/`. After install, from a clean Git working tree on a normal branch (e.g. `main`):

```bash
yarn harness:run
```

That runs `hedera-harness run .harness/spec.yaml`, which:

1. Creates a `harness/run-…` branch (or continues an existing matching session)
2. Asks an agent to implement the recipe PRD without rebuilding the app
3. Checkpoints each attempt and validates against `.harness/validators/`
4. Leaves you on the harness branch with push/PR instructions — it does **not** push, open a PR, merge, or switch back to `main`

Tracked recipe files live under `.harness/` (spec, PRD, validators). Runtime state (`.harness/runs/`, `.harness/cache/`, `.harness/runtime/`) is gitignored.

Requires [Cursor `agent` CLI](https://cursor.com/) (or another command configured in `.harness/spec.yaml`) on your PATH.

This template’s Oracle Comparison recipe is gate **0–1** (static + yarn). If you deepen the recipe with Playwright (gate 2) or on-chain validation (gate 3.5), install the optional peers at the **project root** with Yarn (do not use `npm install` in this repo):

```bash
yarn add -D playwright
yarn playwright install chromium   # gate 2
yarn add -D @hiero-ledger/sdk      # gate 3.5
```

## Foundry Oracle Workflow

Run commands in this section from the repo root.

### Chainlink

Run the Chainlink fork smoke test, deploy the adapter, deploy the demo consumer, and read prices:

```bash
yarn foundry:test:chainlink:testnet
yarn foundry:deploy:chainlink:testnet
ORACLE_ADAPTER_NAME=ChainlinkPriceOracleAdapter yarn foundry:deploy:consumer:testnet
yarn foundry:read:chainlink:testnet
```

Check the exported deployment file:

```bash
cat packages/foundry/deployments/296.json
```

### Supra

Use the same root-level flow for Supra:

```bash
yarn foundry:test:supra:testnet
yarn foundry:deploy:supra:testnet
ORACLE_ADAPTER_NAME=SupraPriceOracleAdapter yarn foundry:deploy:consumer:testnet
yarn foundry:read:supra:testnet
```

To switch an existing consumer to Supra:

```bash
ORACLE_ADAPTER_NAME=SupraPriceOracleAdapter yarn foundry:set-oracle:testnet
```

### Pyth

Pyth is a pull oracle, so read scripts fetch fresh Hermes update data and broadcast update transactions where needed:

```bash
yarn foundry:test:pyth:testnet
yarn foundry:deploy:pyth:testnet
ORACLE_ADAPTER_NAME=PythPriceOracleAdapter yarn foundry:deploy:consumer:testnet
yarn foundry:read:pyth:testnet
```

To switch an existing consumer to Pyth:

```bash
ORACLE_ADAPTER_NAME=PythPriceOracleAdapter yarn foundry:set-oracle:testnet
```

## Frontend Workflow

Foundry deploy scripts export addresses to `packages/foundry/deployments/<chainId>.json`. The ABI generator reads
that deployment file and writes `packages/nextjs/contracts/deployedContracts.ts`, which is what the Next.js app uses
for Scaffold-HBAR contract hooks and dashboard state.

Useful frontend commands:

```bash
yarn next:start
yarn next:check-types
yarn next:build
```

If `deployments/296.json` only lists one adapter, the frontend should only treat that adapter as deployed. Historical
Foundry `broadcast/` files are execution history and do not populate the frontend dashboard.

## Project Layout

- `packages/foundry` - Solidity contracts, Forge scripts, deployment exports, tests, and ABI generation.
- `packages/nextjs` - Next.js app, wallet connection, Scaffold-HBAR hooks, and oracle dashboard UI.
- `packages/nextjs/contracts/deployedContracts.ts` - generated frontend contract metadata.
- `.harness/` - tracked harness recipe (`spec.yaml`, `prd.md`, `validators/`). Run `yarn harness:run` to add the Oracle Comparison page (`/compare`) in place.

Network and RPC configuration for Foundry lives in `packages/foundry/foundry.toml`.

## Verification

Hedera Mainnet (`295`) and Testnet (`296`) are verified through the main Sourcify flow. After Sourcify accepts the
match, HashScan displays the verified status.

Examples:

```bash
yarn foundry:verify:testnet 0xContractAddress contracts/oracle/adapters/ChainlinkPriceOracleAdapter.sol:ChainlinkPriceOracleAdapter
yarn foundry:verify:testnet 0xContractAddress contracts/oracle/adapters/SupraPriceOracleAdapter.sol:SupraPriceOracleAdapter
yarn foundry:verify:testnet 0xContractAddress contracts/oracle/adapters/PythPriceOracleAdapter.sol:PythPriceOracleAdapter
```

Use `yarn foundry:verify:mainnet` with the same contract identifier format for mainnet contracts.

## Where To Go Next

- Read [`packages/foundry/README.md`](packages/foundry/README.md) for oracle architecture, provider flows,
  prerequisites, limitations, and resources.
- Update `packages/foundry/script/HelperConfig.s.sol` when adding networks, feeds, pair IDs, or Pyth price IDs.
- Update deploy scripts when adding new provider adapters or changing the active demo flow.
- Run `yarn foundry:compile` and the relevant provider fork smoke test before broadcasting to Hedera.

## Links

- [Hedera Documentation](https://docs.hedera.com/)
- [Hedera Portal faucet](https://portal.hedera.com/faucet)
- [HashScan](https://hashscan.io/)
- [Foundry Book](https://book.getfoundry.sh/)
- [Sourcify](https://sourcify.dev/)
- [hedera-harness](https://github.com/hedera-dev/hedera-harness)
