# Scaffold-HBAR template - Cross-chain DCA

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

> [!IMPORTANT]
> **Demo limitation — swap proceeds are not user-owned on Sepolia.**
> All tokens purchased by `DcaExecutor` accumulate in the contract itself (`address(this)`), not in the Hedera plan creator's wallet. Only the deployer (contract owner) can withdraw them via `yarn hardhat:sepolia:withdraw:executor`. This is intentional for a demo template — in a production system you would track per-user balances and allow individual withdrawals.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20.18.3
- [Yarn](https://yarnpkg.com/) — **required** (Yarn workspaces; npm and pnpm are not supported)  
  Install via Corepack: `corepack enable && corepack prepare yarn@stable --activate`
- [Git](https://git-scm.com/)
- **Hedera testnet account** — create one at [portal.hedera.com](https://portal.hedera.com) and fund it from the built-in faucet
- **Sepolia RPC URL** — get a free key at [dashboard.alchemy.com](https://dashboard.alchemy.com); format: `https://eth-sepolia.g.alchemy.com/v2/<YOUR_KEY>`
- **Sepolia ETH** for gas — [sepolia-faucet.pk910.de](https://sepolia-faucet.pk910.de/) (PoW, no daily cap) or [Alchemy Sepolia faucet](https://www.alchemy.com/faucets/ethereum-sepolia)
- **Sepolia USDC** — get testnet USDC from [faucet.circle.com](https://faucet.circle.com/)
- **Etherscan API key** — for Sepolia contract verification, get one at [etherscan.io/myapikey](https://etherscan.io/myapikey)

## Quickstart

The fastest path to a running cross-chain DCA deployment. The `yarn hardhat:deploy` command handles all 10 steps — compile, deploy both chains, wire, fund, create a plan, and verify — and prompts interactively for anything it needs.

```bash
# 1. Clone and install
git clone <repo> && cd scaffold-hbar
yarn install

# 2. Generate deployer accounts — run once for Hedera, once for Sepolia
yarn hardhat:account:generate
```

Fund both accounts before deploying:
- **Hedera testnet** — [portal.hedera.com](https://portal.hedera.com) (built-in faucet)
- **Sepolia ETH** — [sepolia-faucet.pk910.de](https://sepolia-faucet.pk910.de/)
- **Sepolia USDC** — [faucet.circle.com](https://faucet.circle.com/)

```bash
# 3. Run the full 10-step deployment
yarn hardhat:deploy
```

The script prompts for the following before touching any network:

| Prompt | When |
|---|---|
| Sepolia RPC URL | Only if not already saved in `.env` |
| Hedera key password | Every run (decrypts the encrypted private key) |
| Sepolia key password | Every run (decrypts the encrypted private key) |
| Etherscan API key | Only if not already saved in `.env` |
| Confirmation | Always — shows full config before proceeding |

Once confirmed, all 10 steps run automatically:

1. Compile all contracts
2. Deploy `DcaOrchestrator` + `AxelarMessageSender` to Hedera testnet
3. Deploy `DcaExecutor` + `AxelarMessageReceiver` to Sepolia
4. Wire Hedera — set Sepolia receiver as Axelar destination
5. Wire Sepolia — set Hedera sender as expected Axelar source
6. Fund `DcaOrchestrator` with HBAR (covers Axelar relay gas)
7. Fund `DcaExecutor` with USDC (swap capital)
8. Create the first DCA plan
9. Verify Hedera contracts on Sourcify
10. Verify Sepolia contracts on Etherscan

After deployment, `packages/nextjs/contracts/deployedContracts.ts` is auto-generated. Do not edit it manually — it is overwritten on every deploy.

```bash
# 4. Start the frontend
yarn next:dev   # http://localhost:3000/dca
```

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

This template’s Cross-Chain Flow recipe is gate **0–1** (static + yarn). It does **not** require Sepolia RPC or live Axelar for acceptance. If you deepen the recipe with Playwright (gate 2) or on-chain validation (gate 3.5), install the optional peers at the **project root** with Yarn (do not use `npm install` in this repo):

```bash
yarn add -D playwright
yarn playwright install chromium   # gate 2
yarn add -D @hiero-ledger/sdk      # gate 3.5
```

## Manual deployment

Use these commands when re-running individual steps after a partial failure or when customizing the deployment sequence.

### Environment setup

```bash
cp packages/hardhat/.env.example packages/hardhat/.env
```

See the [environment variable reference](packages/hardhat/README.md#setup) in `packages/hardhat/README.md` for the full list of variables and where to obtain each value.

### Account setup

```bash
yarn hardhat:account:generate   # Generate a new wallet for Hedera or Sepolia
yarn hardhat:account:import     # Import an existing private key
yarn hardhat:account            # Display address and balance for configured accounts
```

### Compile

```bash
yarn hardhat:compile
```

### Deploy contracts

```bash
yarn hardhat:hedera:deploy    # Deploy DcaOrchestrator + AxelarMessageSender to Hedera testnet
yarn hardhat:sepolia:deploy   # Deploy DcaExecutor + AxelarMessageReceiver to Sepolia
yarn hardhat:hedera:wire      # Set Sepolia receiver as destination on AxelarMessageSender
yarn hardhat:sepolia:wire     # Set Hedera sender as expected source on AxelarMessageReceiver
```

### Fund the contracts

```bash
yarn hardhat:hedera:fund          # Send HBAR to DcaOrchestrator (covers Axelar relay gas)
yarn hardhat:sepolia:fund:usdc    # Send USDC to DcaExecutor on Sepolia
```

### Create a DCA plan

```bash
yarn hardhat:hedera:plan:create   # Create a new plan using values from .env
```

| Variable | Default | Description |
|---|---|---|
| `AMOUNT_PER_EXECUTION` | `1000000` | Source amount per cycle in base units (1 USDC = 1 000 000) |
| `FEE_FOR_SENDER` | `1` | HBAR forwarded per execution to cover Axelar relay gas |
| `INTERVAL_SECONDS` | `60` | Seconds between executions (minimum 60) |
| `TARGET_TOKEN` | Sepolia WETH | Token address to purchase on Sepolia |
| `MAX_EXECUTIONS` | `3` | 0 = unlimited |

Additional plan management:

```bash
yarn hardhat:hedera:plan:latest      # Inspect the most recently created plan
yarn hardhat:hedera:plan:cancel      # Cancel a plan (set CANCEL_PLAN_ID=<id> in .env first)
yarn hardhat:hedera:plan:reschedule  # Reschedule a plan that failed its initial scheduling attempt
yarn hardhat:sepolia:balance:check   # Check ETH, USDC, and WETH balances on DcaExecutor
```

### Verify contracts

```bash
yarn hardhat:hedera:verify    # Verify Hedera contracts on Sourcify (no API key required)
yarn hardhat:sepolia:verify   # Verify Sepolia contracts on Etherscan (prompts for API key if not saved)
```

### Withdraw

```bash
yarn hardhat:hedera:withdraw:orchestrator   # Withdraw all HBAR from DcaOrchestrator
yarn hardhat:hedera:withdraw:sender         # Withdraw all HBAR from AxelarMessageSender
yarn hardhat:sepolia:withdraw:executor      # Withdraw all ETH and ERC-20 tokens from DcaExecutor
yarn hardhat:sepolia:withdraw:receiver      # Withdraw all ETH and ERC-20 tokens from AxelarMessageReceiver
```

## Test

```bash
yarn hardhat:hedera:test    # Unit tests for Hedera contracts — no .env or live RPC required
yarn hardhat:sepolia:test   # Unit tests for Sepolia contracts — no .env or live RPC required
```

## Frontend

Navigate to `http://localhost:3000/dca` after starting `yarn next:dev`. Connect your wallet to **Hedera testnet** (chain 296) to create and cancel plans. The execution log loads data from both chains in read-only mode without requiring a wallet.

### Create plan

A form that submits a new DCA plan to `DcaOrchestrator`. Requires a wallet connected to Hedera testnet.

> **Note:** Purchased tokens accumulate in the `DcaExecutor` contract on Sepolia, not in your wallet. Only the deployer can withdraw them via `yarn hardhat:sepolia:withdraw:executor`.

| Field | Default | Description |
|---|---|---|
| Amount per execution (USDC) | 1 | USDC amount swapped each cycle |
| Relay fee per execution (HBAR) | 1 | HBAR forwarded per execution to cover Axelar relay gas |
| Interval (seconds) | 3600 | Minimum 60 s |
| Max executions | 0 | 0 = unlimited |
| Target token address (Sepolia) | Sepolia WETH (`0xfFf9…`) | Token to purchase on Sepolia via Uniswap v3 |

### Active plans

Reads all plans from `DcaOrchestrator` and displays a live table. No wallet required.

| Column | Description |
|---|---|
| ID | Plan ID |
| Amount | USDC amount per execution |
| Interval | Execution interval, displayed as hours or seconds |
| Executions | `count / max` — shows ∞ when unlimited |
| Status | `active`, `completed`, or `cancelled` |
| Action | Cancel button — visible to the plan owner for active plans |

### Execution log

Displays the last 10,000 blocks of on-chain events from both chains with live updates. Hedera at ~1.8 s/block covers roughly 5 hours; Sepolia at ~12 s/block covers roughly 33 hours.

**Hedera — Execution Triggers** (`DcaOrchestrator.ExecutionTriggered`):

| Column | Description |
|---|---|
| Block | Hedera block number |
| Plan ID | Plan that was triggered |
| Execution # | Cumulative execution count for that plan |

**Sepolia — Swap Executions** (`DcaExecutor.SwapExecuted`):

| Column | Description |
|---|---|
| Block | Sepolia block number |
| Plan ID | Matching plan ID originating from Hedera |
| Amount In | USDC sent to Uniswap v3 |
| Amount Out | Tokens received (WETH by default) |
| Token Out | Target token address |

## Links

- [`packages/hardhat/README.md`](packages/hardhat/README.md) — contract layout, all scripts, environment variables
- [Hedera Documentation](https://docs.hedera.com/)
- [Axelar Documentation](https://docs.axelar.dev/)
- [Hashscan testnet](https://hashscan.io/testnet) — Hedera block explorer
- [create-scaffold-hbar](https://github.com/buidler-labs/create-scaffold-hbar) — CLI to scaffold Hedera dApps
- [hedera-harness](https://github.com/hedera-dev/hedera-harness) — co-versioned harness recipe under `.harness/` (`yarn harness:run`)
