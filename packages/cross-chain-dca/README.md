# cross-chain-dca

A Scaffold-HBAR template package demonstrating Hedera as a cross-chain orchestration layer for automated DeFi (DCA) workflows.

## Architecture

- **Hedera testnet** — control plane. `DcaOrchestrator` stores DCA plans and uses the Hedera Schedule Service (HIP-1215) to trigger recurring cross-chain executions fully on-chain — no off-chain keepers.
- **Axelar GMP** — messaging layer. Each execution dispatches a `callContract` message from Hedera to Sepolia.
- **Sepolia** — execution plane. `DcaExecutor` receives the GMP message and performs a token swap via Uniswap v3.

```
Hedera (DcaOrchestrator)
  └─ Schedule Service precompile (0x16b) — self-reschedule
  └─ Axelar Gateway → callContract("ethereum-sepolia", ...)
        └─ Axelar relayer network
              └─ Sepolia (DcaExecutor)
                    └─ Uniswap v3 exactInputSingle
```

## Package structure

```
packages/cross-chain-dca/
  hedera-orchestrator/        Hardhat project — DcaOrchestrator.sol + AxelarMessageSender.sol
    contracts/                Solidity source
    contracts/test/           Mock contracts for unit tests
    scripts/                  Deploy and management scripts
    test/                     Hardhat unit tests
    hardhat.config.ts         Targets hedera-testnet (chain 296)
  sepolia-executor/           Hardhat project — DcaExecutor.sol + AxelarMessageReceiver.sol
    contracts/                Solidity source
    contracts/test/           Mock contracts for unit tests
    scripts/                  Deploy and management scripts
    test/                     Hardhat unit tests
    hardhat.config.ts         Targets sepolia (chain 11155111)
  scripts/
    deploy-all.sh             Combined deploy — Hedera first, then Sepolia
    generate-deployed-contracts.ts  Writes deployedContracts.ts after deploy
  config/
    deployed-addresses.json         Written at deploy time, gitignored
    deployed-addresses.example.json Shape reference
  .env                        Gitignored — copy from .env.example
  .env.example                All required variables with descriptions
```

## Prerequisites

- Node.js >= 20
- Yarn (this monorepo uses Yarn 3)
- A Hedera testnet account — [portal.hedera.com](https://portal.hedera.com)
- A Sepolia RPC URL (Infura, Alchemy, or a public endpoint)
- Sepolia USDC from [faucet.circle.com](https://faucet.circle.com/)

## Setup

```bash
# From the scaffold-hbar repo root
cp packages/cross-chain-dca/.env.example packages/cross-chain-dca/.env
# Edit packages/cross-chain-dca/.env with your keys and RPC URLs
yarn install
```

## Compile

```bash
yarn dca:hedera:compile
yarn dca:sepolia:compile
```

## Deploy

### Full deployment (recommended)

```bash
yarn dca:deploy
```

Deploys Hedera first (writes `hederaMessageSender` + `hederaOrchestrator` to `config/deployed-addresses.json`), then deploys Sepolia (reads `hederaMessageSender` to wire the receiver). After both deploys, `deployedContracts.ts` in the Next.js package is updated automatically.

### Step-by-step

Deploy Hedera first — Sepolia deploy requires the `hederaMessageSender` address:

```bash
yarn dca:hedera:deploy
yarn dca:sepolia:deploy
yarn dca:hedera:wire     # update AxelarMessageSender destination if Sepolia wasn't deployed at Hedera deploy time
```

### Fund the orchestrator

The orchestrator forwards `feeForSender` HBAR to `AxelarMessageSender` on each execution to cover Axelar relay gas. Fund it with at least `maxExecutions × feeForSender` HBAR:

```bash
yarn dca:hedera:fund
# default: 10 HBAR — override with ORCHESTRATOR_FUND_AMOUNT=50
```

### Fund the executor with USDC

The executor is pre-funded with USDC on Sepolia — it swaps this for the target token on each DCA cycle:

```bash
yarn dca:sepolia:fund:usdc
# default: 5 USDC — override with FUND_USDC_AMOUNT=100
```

## Manage DCA plans

```bash
yarn dca:hedera:plan:create     # create a new DCA plan (see env vars below)
yarn dca:hedera:plan:cancel     # cancel a plan (requires CANCEL_PLAN_ID=<id>)
yarn dca:hedera:plan:latest     # inspect the latest plan — no tx sent
```

### Plan creation env overrides

| Variable               | Default           | Description                                                          |
| ---------------------- | ----------------- | -------------------------------------------------------------------- |
| `AMOUNT_PER_EXECUTION` | `1000000`         | Source token amount per cycle (base units; 1 USDC = 1000000)        |
| `FEE_FOR_SENDER`       | `1`               | HBAR forwarded per execution to cover Axelar relay gas               |
| `INTERVAL_SECONDS`     | `60`              | Seconds between executions                                           |
| `TARGET_TOKEN`         | Sepolia WETH      | Token address to purchase on Sepolia                                 |
| `MIN_AMOUNT_OUT`       | `0`               | Minimum swap output in target token base units — set this in prod    |
| `MAX_EXECUTIONS`       | `3`               | 0 = unlimited                                                        |

## Run tests

```bash
yarn dca:hedera:test
yarn dca:sepolia:test
```

Tests run on a local in-process Hardhat network — no `.env` or live RPC required.

## Sepolia utilities

```bash
yarn dca:sepolia:balance:check   # check ETH, USDC, WETH balances of DcaExecutor
yarn dca:sepolia:verify          # verify contracts on Sepolia Etherscan (requires ETHERSCAN_API_KEY)
yarn dca:sepolia:wire            # re-wire AxelarMessageReceiver source chain/address
```

## Environment variables

All variables live in `packages/cross-chain-dca/.env` (copy from `.env.example`).

### Hedera

| Variable                        | Required | Default                                      | Description                                       |
| ------------------------------- | -------- | -------------------------------------------- | ------------------------------------------------- |
| `HEDERA_PRIVATE_KEY`            | yes      | —                                            | EVM private key for the Hedera deployer account   |
| `HEDERA_RPC_URL`                |          | `https://testnet.hashio.io/api`              | Hedera JSON-RPC relay endpoint                    |
| `HEDERA_CHAIN_ID`               |          | `296`                                        | Hedera testnet chain ID                           |
| `AXELAR_GATEWAY_HEDERA`         |          | `0xe432...E31`                               | Axelar Gateway on Hedera testnet                  |
| `AXELAR_GAS_SERVICE_HEDERA`     |          | `0xbE40...C6`                                | Axelar Gas Service on Hedera testnet              |
| `AXELAR_DESTINATION_CHAIN_NAME` |          | `ethereum-sepolia`                           | Axelar chain name for the destination (Sepolia)   |
| `ORCHESTRATOR_FUND_AMOUNT`      |          | `10`                                         | HBAR to send to DcaOrchestrator in `fund` script  |

### Sepolia

| Variable                   | Required | Default                                      | Description                                        |
| -------------------------- | -------- | -------------------------------------------- | -------------------------------------------------- |
| `SEPOLIA_PRIVATE_KEY`      | yes      | —                                            | EVM private key for the Sepolia deployer account   |
| `SEPOLIA_RPC_URL`          | yes      | —                                            | Sepolia JSON-RPC endpoint                          |
| `AXELAR_GATEWAY_SEPOLIA`   | yes      | —                                            | Axelar Gateway on Sepolia (required for deploy)    |
| `SEPOLIA_CHAIN_ID`         |          | `11155111`                                   | Sepolia chain ID                                   |
| `ETHERSCAN_API_KEY`        |          | —                                            | Required for `sepolia:verify`                      |
| `AXELAR_SOURCE_CHAIN_NAME` |          | `hedera`                                     | Axelar chain name for the source (Hedera)          |
| `UNISWAP_ROUTER`           |          | `0x6566...12`                                | Uniswap v3 SwapRouter on Sepolia                   |
| `USDC_ADDRESS`             |          | `0x1c7D...238`                               | Circle USDC on Sepolia                             |
| `FUND_USDC_AMOUNT`         |          | `5`                                          | Whole-token USDC amount for `fund:usdc` script     |

## Frontend

After deploying, the Next.js frontend at `http://localhost:3000/dca` provides:

- **Create plan** — wallet-connected form to create a DCA plan on Hedera testnet
- **Active plans** — list all active plans with a cancel button
- **Execution log** — read-only log of Hedera `ExecutionTriggered` events and Sepolia `SwapExecuted` events

Connect your wallet to Hedera testnet to interact. Sepolia data loads in read-only mode without a wallet switch.

## Design decisions

- **Self-rescheduling**: The orchestrator calls the Hedera Schedule Service precompile at `0x16b` (HIP-1215) to schedule the next execution on every cycle. No off-chain keeper or signing required.
- **Instruction-only**: `callContract` only — no token bridging. The executor is pre-funded with USDC on Sepolia. Bridging is a documented future enhancement.
- **Fire-and-forget**: No GMP acknowledgment from Sepolia back to Hedera. The orchestrator reschedules unconditionally. A return ack is out of scope for this template.
- **Bridge abstraction**: `DcaOrchestrator` communicates with `IBridgeSender`, not Axelar directly. Swapping out the bridge only requires a new `IBridgeSender` implementation.
