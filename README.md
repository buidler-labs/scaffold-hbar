# cross-chain-dca — Scaffold-HBAR template

A Scaffold-HBAR template that uses **Hedera as a cross-chain orchestration layer** for automated DCA (Dollar-Cost Averaging) workflows. Hedera schedules recurring executions fully on-chain via the Hedera Schedule Service (HIP-1215); each execution dispatches a cross-chain message via Axelar GMP to a Uniswap v3 swap on Sepolia.

```
Hedera (DcaOrchestrator)
  └─ Schedule Service precompile (0x16b) — self-reschedule
  └─ Axelar Gateway → callContract("ethereum-sepolia", ...)
        └─ Axelar relayer network
              └─ Sepolia (DcaExecutor)
                    └─ Uniswap v3 exactInputSingle
```

For lower-level package details (contracts, scripts, environment variables) see [`packages/hardhat/README.md`](packages/hardhat/README.md).

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20.18.3
- [Yarn](https://yarnpkg.com/) — **required** (Yarn workspaces; npm and pnpm are not supported)  
  Install via Corepack: `corepack enable && corepack prepare yarn@stable --activate`
- [Git](https://git-scm.com/)
- **Hedera testnet account** — create one at [portal.hedera.com](https://portal.hedera.com) and fund it from the [Hedera faucet](https://portal.hedera.com/faucet)
- **Sepolia RPC URL** — [Infura](https://infura.io), [Alchemy](https://www.alchemy.com), or a public endpoint
- **Sepolia ETH** for gas — get testnet ETH from a faucet such as [sepolia-faucet.pk910.de](https://sepolia-faucet.pk910.de/) (PoW faucet, no daily cap) or the [Alchemy Sepolia faucet](https://www.alchemy.com/faucets/ethereum-sepolia)
- **Sepolia USDC** — the executor is pre-funded with USDC; get some from [faucet.circle.com](https://faucet.circle.com/)

## Setup

```bash
# 1. Clone and install
git clone <repo> && cd scaffold-hbar
yarn install

# 2. Configure environment
cp packages/hardhat/.env.example packages/hardhat/.env
# Edit packages/hardhat/.env:
#   HEDERA_PRIVATE_KEY  — EVM private key for your Hedera testnet account
#   SEPOLIA_PRIVATE_KEY — EVM private key for your Sepolia account
#   SEPOLIA_RPC_URL     — your Sepolia JSON-RPC endpoint
#   AXELAR_GATEWAY_SEPOLIA — Axelar Gateway address on Sepolia
```

## Compile

```bash
yarn hardhat:compile
```

## Deploy

### Full deployment (recommended)

```bash
yarn hardhat:deploy
```

Deploys Hedera contracts first, then Sepolia (wired to the Hedera sender address), funds both sides, and creates the first DCA plan. Updates `packages/nextjs/contracts/deployedContracts.ts` automatically.

### Step-by-step

```bash
yarn hardhat:hedera:deploy
yarn hardhat:sepolia:deploy
yarn hardhat:hedera:wire    # re-wire if Sepolia was deployed after Hedera
```

### Fund the contracts

```bash
yarn hardhat:hedera:fund          # send HBAR to DcaOrchestrator to cover Axelar relay gas
yarn hardhat:sepolia:fund:usdc    # send USDC to DcaExecutor on Sepolia
```

## Create a DCA plan

```bash
yarn hardhat:hedera:plan:create   # uses env overrides for amount, interval, max executions
```

| Variable               | Default      | Description                                              |
| ---------------------- | ------------ | -------------------------------------------------------- |
| `AMOUNT_PER_EXECUTION` | `1000000`    | Source token amount per cycle (base units; 1 USDC = 1M) |
| `FEE_FOR_SENDER`       | `1`          | HBAR forwarded per execution to cover Axelar relay gas  |
| `INTERVAL_SECONDS`     | `60`         | Seconds between executions                               |
| `TARGET_TOKEN`         | Sepolia WETH | Token address to purchase on Sepolia                     |
| `MAX_EXECUTIONS`       | `3`          | 0 = unlimited                                            |

## Test

```bash
yarn hardhat:hedera:test    # Hardhat unit tests — no .env or live RPC required
yarn hardhat:sepolia:test   # Hardhat unit tests — no .env or live RPC required
```

## Frontend

```bash
yarn next:start   # http://localhost:3000
```

Navigate to `http://localhost:3000/dca`. Connect your wallet to **Hedera testnet** to create and cancel plans. Sepolia execution data loads in read-only mode without a wallet switch.

- **Create plan** — form to create a DCA plan on Hedera testnet
- **Active plans** — list active plans with a cancel button
- **Execution log** — Hedera `ExecutionTriggered` events and Sepolia `SwapExecuted` events

## Links

- [`packages/hardhat/README.md`](packages/hardhat/README.md) — package-level details: contract layout, scripts, environment variables
- [Hedera Documentation](https://docs.hedera.com/)
- [Axelar Documentation](https://docs.axelar.dev/)
- [Hashscan testnet](https://hashscan.io/testnet) — Hedera block explorer
- [create-scaffold-hbar](https://github.com/buidler-labs/create-scaffold-hbar) — CLI to scaffold Hedera dApps
