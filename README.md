# Scaffold-HBAR — Payments scheduler

Recurring on-chain execution on Hedera via **Schedule Service (HSS)**: a generic **ScheduledVault** custodies funds and runs pluggable **IExecutionStrategy** plugins on each schedule tick. Example strategy: **MemejobDCAStrategy** (MemeJob DCA buy/sell).

CLI key: `payments-scheduler` (branch `templates/payments-scheduler`).

> **HSS is testnet/mainnet only** — Schedule Service is not available on Hedera forks or local Anvil. Deploy and run schedules on live Hedera networks.

General Scaffold-HBAR docs: [Scaffold HBAR on Hedera](https://docs.hedera.com/solutions/tools/scaffold-hbar/index). Architecture, lifecycle, Makefile, and verification: [packages/foundry/README.md](packages/foundry/README.md).

## What's in this template

- **Foundry-only** monorepo — `ScheduledVault`, `ScheduledVaultFactory`, example `MemejobDCAStrategy`
- Next.js **Memejob DCA** UI — create vault, configure DCA, monitor schedule status
- Block explorer routes under `/blockexplorer`
- Deploy exports → `packages/foundry/deployments/<chainId>.json` → `packages/nextjs/contracts/deployedContracts.ts`

Create a project:

```bash
npm create scaffold-hbar@latest -- --template payments-scheduler
```

## Quick start

### Prerequisites

- Node.js ≥ 20.18.3, Yarn (Corepack), Git
- [Foundry](https://book.getfoundry.sh/getting-started/installation) (`forge`, `cast`)
- Hedera testnet account — fund via [portal.hedera.com](https://portal.hedera.com/faucet)

### Install

```bash
yarn install
# In packages/foundry (once): forge install — see packages/foundry/README.md
```

### Compile, test, deploy

```bash
yarn foundry:account:generate   # once — fund on testnet

yarn foundry:compile
yarn foundry:test               # local tests (mock HSS)

yarn foundry:deploy:testnet     # factory + example strategy on Hedera testnet

yarn foundry:verify:testnet 0xYourFactory \
  contracts/ScheduledVaultFactory.sol:ScheduledVaultFactory

yarn next:dev                   # http://localhost:3000
```

Use `yarn foundry:deploy:mainnet` and `yarn foundry:verify:mainnet` for mainnet (at your own risk).

Optional fork tests (no real HSS): `yarn foundry:test:testnet`, `yarn foundry:test:local` (requires `yarn foundry:chain`).

## Scripts (root)

| Command | Description |
|---|---|
| `yarn foundry:compile` / `yarn foundry:test` | Build + Forge unit tests |
| `yarn foundry:deploy:testnet` / `:mainnet` | Deploy default `Deploy.s.sol` |
| `yarn foundry:verify:testnet` / `:mainnet` | Sourcify verify (HashScan) |
| `yarn foundry:chain` | Local Anvil (optional; HSS not supported) |
| `yarn next:dev` | Memejob DCA frontend |
| `yarn lint` | Next.js + Foundry lint |

## Project layout

- **packages/foundry** — vault, factory, strategies, scripts, tests
- **packages/nextjs** — DCA UI, wallet connect, block explorer, scaffold hooks

## Links

- [Scaffold HBAR docs](https://docs.hedera.com/solutions/tools/scaffold-hbar/index)
- [create-scaffold-hbar](https://github.com/hedera-dev/create-scaffold-hbar) — CLI
- [Foundry Book](https://book.getfoundry.sh/)
- [Hedera Portal faucet](https://portal.hedera.com/faucet)
- [HashScan testnet](https://hashscan.io/testnet)
