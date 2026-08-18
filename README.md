# Scaffold-HBAR — Bridge starter

Testnet-first bridge learning kit: connect **Ethereum Sepolia** and **Hedera Testnet** with a Next.js UI and Foundry scripts for Axelar ITS, Chainlink CCIP, and LayerZero OFT.

CLI key: `bridge` (branch `templates/bridge`).

> **Educational disclaimer:** example contracts, scripts, and UI flows for learning. Not audited, not production-ready. Use testnets and small amounts only.

The full Scaffold-HBAR product guide lives in [Scaffold HBAR on Hedera docs](https://docs.hedera.com/solutions/tools/scaffold-hbar/index). This README is what is specific to **this** template.

## What's in this template

- Next.js bridge UI for Axelar, CCIP, and LayerZero (`/`)
- Foundry contracts and provider runbooks under `packages/foundry/script/{axelar,ccip,layerzero}/`
- Config sync from Foundry deploy state into `packages/nextjs/services/bridge/config/*.json`
- Foundry-only monorepo (no Hardhat package)

Create a project from this template:

```bash
npm create scaffold-hbar@latest -- --template bridge
```

## Quick start

This branch uses Yarn workspaces and Foundry git submodules.

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 20.18.3
- [Yarn](https://yarnpkg.com/) via Corepack: `corepack enable && corepack prepare yarn@stable --activate`
- [Foundry](https://book.getfoundry.sh/getting-started/installation) (`forge`, `cast`, `anvil`)
- [Git](https://git-scm.com/)

### Install

```bash
yarn install
git submodule update --init --recursive
```

Configure `packages/foundry/.env` (`ACCOUNT`, `SEPOLIA_RPC_URL`, `HEDERA_TESTNET_RPC_URL`). See [`packages/foundry/README.md`](packages/foundry/README.md).

### Deploy one provider, sync, test UI

```bash
cd packages/foundry
make axelar-help    # or ccip-help / layerzero-help
# follow that provider's README, then:
make bridge-sync-next PROVIDER=axelar

cd ../..
yarn next:dev
```

Open [http://localhost:3000](http://localhost:3000), connect the same funded testnet EOA, pick the provider and direction, and send a small amount.

Full UI checklist: [`packages/nextjs/README.md`](packages/nextjs/README.md).

## Project layout

- **packages/foundry** — contracts, Makefile, provider scripts, tests, bridge config sync
- **packages/nextjs** — bridge UI, RainbowKit, wagmi, bridge config JSON

Provider runbooks:

| Provider | Runbook |
| --- | --- |
| Axelar | [`packages/foundry/script/axelar/README.md`](packages/foundry/script/axelar/README.md) |
| CCIP | [`packages/foundry/script/ccip/README.md`](packages/foundry/script/ccip/README.md) |
| LayerZero | [`packages/foundry/script/layerzero/README.md`](packages/foundry/script/layerzero/README.md) |

## Links

- [Scaffold HBAR docs](https://docs.hedera.com/solutions/tools/scaffold-hbar/index)
- [create-scaffold-hbar](https://github.com/hedera-dev/create-scaffold-hbar) — CLI
- [Hedera Portal faucet](https://portal.hedera.com/faucet)
- [HashScan](https://hashscan.io/)
