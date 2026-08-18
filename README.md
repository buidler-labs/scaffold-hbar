# Scaffold-HBAR — Oracles

Hedera oracle dApp template: **Chainlink**, **Supra**, and **Pyth** adapters normalize feeds into one `IPriceOracle` interface; an `OracleConsumer` demo converts amounts with `priceE18`. Next.js dashboard reads deployed adapters and the active consumer.

CLI key: `oracles` (branch `templates/oracles`).

```text
Provider feed → Multi-pair provider adapter → OracleConsumer demo
```

General Scaffold-HBAR docs: [Scaffold HBAR on Hedera](https://docs.hedera.com/solutions/tools/scaffold-hbar/index). Architecture, provider flows, env vars, and Makefile targets: [packages/foundry/README.md](packages/foundry/README.md).

## What's in this template

- **Foundry-only** monorepo (adapters, consumer, Forge scripts, tests, ABI generation)
- Provider adapters: `ChainlinkPriceOracleAdapter`, `SupraPriceOracleAdapter`, `PythPriceOracleAdapter`
- Next.js oracle dashboard + Debug Contracts
- Deploy exports → `packages/foundry/deployments/<chainId>.json` → generated `packages/nextjs/contracts/deployedContracts.ts`

Create a project:

```bash
npm create scaffold-hbar@latest -- --template oracles
```

## Quick start

### Prerequisites

- Node.js ≥ 20.18.3, Yarn (Corepack), Git
- [Foundry](https://book.getfoundry.sh/getting-started/installation) (`forge`, `cast`)
- Hedera testnet account — fund via [portal.hedera.com](https://portal.hedera.com/faucet)

### Install

```bash
yarn install
git submodule update --init --recursive
```

### Compile, test, deploy (Chainlink example)

```bash
yarn foundry:account:generate   # once — fund on testnet

yarn foundry:compile
yarn foundry:test               # local unit tests

yarn foundry:test:chainlink:testnet   # fork smoke test (optional, needs RPC)

yarn foundry:deploy:chainlink:testnet
ORACLE_ADAPTER_NAME=ChainlinkPriceOracleAdapter yarn foundry:deploy:consumer:testnet
yarn foundry:read:chainlink:testnet

yarn next:dev                   # http://localhost:3000
```

Supra and Pyth use the same pattern — swap `chainlink` for `supra` or `pyth` in the script names. Pyth is pull-based (Hermes update + fee before read). See [packages/foundry/README.md](packages/foundry/README.md).

Switch an existing consumer to another adapter:

```bash
ORACLE_ADAPTER_NAME=SupraPriceOracleAdapter yarn foundry:set-oracle:testnet
```

Verify on Sourcify (HashScan shows verified status):

```bash
yarn foundry:verify:testnet 0xYourAdapter \
  contracts/oracle/adapters/ChainlinkPriceOracleAdapter.sol:ChainlinkPriceOracleAdapter
```

## Scripts (root)

| Command | Description |
|---|---|
| `yarn foundry:compile` / `yarn foundry:test` | Build + local Forge tests |
| `yarn foundry:test:<provider>:testnet` | Provider fork smoke tests |
| `yarn foundry:deploy:<provider>:testnet` | Deploy adapter |
| `yarn foundry:deploy:consumer:testnet` | Deploy `OracleConsumer` (set `ORACLE_ADAPTER_NAME`) |
| `yarn foundry:read:<provider>:testnet` | Read prices from CLI |
| `yarn foundry:set-oracle:testnet` | Point consumer at another adapter |
| `yarn next:dev` | Frontend dashboard |
| `yarn lint` | Next.js + Foundry lint |

## Project layout

- **packages/foundry** — contracts, scripts, tests, deployments, `HelperConfig.s.sol`
- **packages/nextjs** — oracle dashboard UI, wallet connect, scaffold hooks

## Links

- [Scaffold HBAR docs](https://docs.hedera.com/solutions/tools/scaffold-hbar/index)
- [create-scaffold-hbar](https://github.com/hedera-dev/create-scaffold-hbar) — CLI
- [Foundry Book](https://book.getfoundry.sh/)
- [Hedera Portal faucet](https://portal.hedera.com/faucet)
- [HashScan testnet](https://hashscan.io/testnet)
- [Sourcify](https://sourcify.dev/)
