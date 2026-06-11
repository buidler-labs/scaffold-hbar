# Scaffold-HBAR Bridge Template

A testnet-first bridge template for learning how to connect Ethereum Sepolia and Hedera Testnet with a Next.js UI and Foundry scripts.

> **Educational disclaimer:** this repository contains example contracts, scripts, and UI flows for learning. The bridge contracts are not audited, not production-ready, and should not be used with real funds. Use them on testnets only, then review, redesign, and audit before building a production bridge.

## Start Here

This tutorial path is for a new user who wants to clone the repo, deploy one bridge provider, sync the frontend config, and test the UI.

### 1. Install prerequisites

- [Node.js](https://nodejs.org/) >= 20.18.3
- [Yarn](https://yarnpkg.com/) through Corepack:
  ```bash
  corepack enable
  corepack prepare yarn@stable --activate
  ```
- [Git](https://git-scm.com/)
- [Foundry](https://book.getfoundry.sh/getting-started/installation), including `forge`, `cast`, and `anvil`

### 2. Install the template

```bash
git clone <your-repo-url>
cd bridge-template
git submodule update --init --recursive
yarn install
```

`yarn install` copies `packages/foundry/.env.example` to `packages/foundry/.env` if the file does not already exist.

### 3. Configure testnet access

Edit `packages/foundry/.env` and set:

```bash
ACCOUNT=your_foundry_keystore_alias
SEPOLIA_RPC_URL=https://...
HEDERA_TESTNET_RPC_URL=https://testnet.hashio.io/api
```

For the frontend, copy `packages/nextjs/.env.example` to `packages/nextjs/.env` if you want to override browser RPC URLs or use the LayerZero automatic relay from the UI. The LayerZero relay needs a server-only funded testnet key:

```bash
LAYERZERO_RELAY_PRIVATE_KEY=0x...
```

You also need native testnet gas on the same deployer EOA:

- Sepolia ETH for Sepolia deployments and sends.
- Hedera testnet HBAR for Hedera deployments, HTS token creation, approvals, and sends.

Create or import the Foundry account:

```bash
yarn foundry:account:generate
# or
yarn foundry:account:import
```

Then fund the account. You can use the [Hedera Portal faucet](https://portal.hedera.com/faucet) for Hedera Testnet HBAR and any Sepolia faucet for Sepolia ETH.

### 4. Pick one bridge provider

Run one provider runbook from `packages/foundry`:

```bash
cd packages/foundry

# Pick one:
make axelar-help
make ccip-help
make layerzero-help
```

Provider tutorials:

| Provider | What it demonstrates | Runbook |
| --- | --- | --- |
| Axelar | Interchain Token Service creating a native Hedera HTS token through ITS and deploying its remote Sepolia token through ITS | [`packages/foundry/script/axelar/README.md`](packages/foundry/script/axelar/README.md) |
| CCIP | Chainlink Cross-Chain Token burn-and-mint flow | [`packages/foundry/script/ccip/README.md`](packages/foundry/script/ccip/README.md) |
| LayerZero | LayerZero V2 OFT flow with a Hedera HTS connector | [`packages/foundry/script/layerzero/README.md`](packages/foundry/script/layerzero/README.md) |

Each helper records deployed addresses under `packages/foundry/deployments/bridge/`. Those files are local generated state and are ignored by git.

### 5. Sync the frontend bridge config

After a provider is deployed and configured, sync its recorded addresses into the Next.js config:

```bash
cd packages/foundry
make bridge-sync-next PROVIDER=axelar
# or: PROVIDER=ccip, PROVIDER=layerzero, PROVIDER=all
```

This updates `packages/nextjs/services/bridge/config/*.json`.

### 6. Test the UI

From the repo root:

```bash
yarn next:start
```

Open [http://localhost:3000](http://localhost:3000), connect the wallet for the same funded EOA, choose the provider and direction, approve when prompted, and send a small test amount.

LayerZero uses educational simple workers in this template. The UI attempts to relay automatically when `LAYERZERO_RELAY_PRIVATE_KEY` is configured; otherwise it shows the manual `make layerzero-relay ...` command to run from `packages/foundry`.

See [`packages/nextjs/README.md`](packages/nextjs/README.md) for the full UI testing checklist.

## Common Commands

Run these from the repo root unless noted otherwise.

| Command | Purpose |
| --- | --- |
| `yarn foundry:account:generate` | Create a Foundry keystore account |
| `yarn foundry:account:import` | Import an existing private key into a Foundry keystore |
| `yarn foundry:compile` | Compile Foundry contracts |
| `yarn foundry:test` | Run Foundry tests |
| `yarn foundry:verify:testnet 0xAddress contracts/MyContract.sol:MyContract` | Verify a Hedera Testnet contract on Sourcify |
| `yarn next:start` | Start the Next.js bridge UI |
| `yarn next:build` | Build the Next.js app |
| `yarn next:check-types` | Type-check the Next.js app |

Provider-specific deploy and transfer commands are intentionally run from `packages/foundry` through `make axelar-*`, `make ccip-*`, and `make layerzero-*`.

## Project Layout

- `packages/foundry` - Solidity contracts, Foundry scripts, provider runbooks, tests, and bridge config sync tooling.
- `packages/nextjs` - Next.js App Router frontend, RainbowKit, wagmi, bridge UI, and bridge config JSON files.

## Links

- [Foundry package guide](packages/foundry/README.md)
- [Next.js frontend guide](packages/nextjs/README.md)
- [Hedera Documentation](https://docs.hedera.com/)
- [HashScan](https://hashscan.io/)
- [Hedera Token Service](https://docs.hedera.com/hedera/core-concepts/hedera-token-service-hts)
