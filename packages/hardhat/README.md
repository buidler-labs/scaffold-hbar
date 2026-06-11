# packages/hardhat — cross-chain DCA

Hardhat config, contracts, scripts, and tests for the cross-chain DCA template. Contains contracts for both chains:

- `contracts/hedera/` — `DcaOrchestrator` + `AxelarMessageSender` (Hedera testnet, chain 296)
- `contracts/sepolia/` — `DcaExecutor` + `AxelarMessageReceiver` (Sepolia, chain 11155111)

## Setup

```bash
cp .env.example .env
# Fill in HEDERA_PRIVATE_KEY, SEPOLIA_PRIVATE_KEY, SEPOLIA_RPC_URL, AXELAR_GATEWAY_SEPOLIA
```

## Compile

```bash
yarn compile          # both contract sets
yarn hedera:compile   # same — alias kept for symmetry
yarn sepolia:compile  # same — alias kept for symmetry
```

## Deploy

```bash
yarn deploy           # full 8-step deployment (both chains + funding + plan)
yarn hedera:deploy    # Hedera contracts only (--network hedera-testnet)
yarn sepolia:deploy   # Sepolia contracts only (--network sepolia)
yarn hedera:wire      # re-wire AxelarMessageSender after Sepolia deploy
yarn sepolia:wire     # re-wire AxelarMessageReceiver after Hedera deploy
```

## Fund and manage

```bash
yarn hedera:fund            # send HBAR to DcaOrchestrator
yarn sepolia:fund:usdc      # send USDC to DcaExecutor
yarn hedera:plan:create     # create a DCA plan
yarn hedera:plan:cancel     # cancel (set CANCEL_PLAN_ID=<id>)
yarn hedera:plan:latest     # inspect the latest plan
yarn sepolia:balance:check  # check ETH / USDC / WETH balances
```

## Withdraw

```bash
yarn hedera:withdraw:orchestrator
yarn hedera:withdraw:sender
yarn sepolia:withdraw:executor
yarn sepolia:withdraw:receiver
```

## Test

```bash
yarn test               # all tests
yarn hedera:test        # Hedera contracts only
yarn sepolia:test       # Sepolia contracts only
```

Tests run on the in-process Hardhat network — no `.env` or live RPC required.

## Verify

```bash
yarn verify:testnet               # Hedera contracts via Sourcify (chain 296)
yarn sepolia:verify               # Sepolia contracts via Etherscan (requires ETHERSCAN_API_KEY)
```

## Layout

```
contracts/
  hedera/           DcaOrchestrator.sol, AxelarMessageSender.sol, interfaces/, test/
  sepolia/          DcaExecutor.sol, AxelarMessageReceiver.sol, interfaces/, test/
scripts/
  hedera/           deploy, wire, fund, plan management, withdraw scripts
  sepolia/          deploy, wire, fund, balance-check, verify, withdraw scripts
  generate-deployed-contracts.ts  writes packages/nextjs/contracts/deployedContracts.ts
  deploy-all.sh     full 8-step deployment
test/
  hedera/           DcaOrchestrator.ts, AxelarMessageSender.ts
  sepolia/          DcaExecutor.ts
config/
  deployed-addresses.example.json  shape reference
  deployed-addresses.json          written at deploy time, gitignored
hardhat.config.ts   networks: hardhat, hedera-testnet, hederaTestnet, hederaMainnet, sepolia
```
