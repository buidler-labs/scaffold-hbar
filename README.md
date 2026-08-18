# Scaffold-HBAR — Cross-chain DCA

Hedera schedules recurring DCA executions on-chain (Hedera Schedule Service, HIP-1215). Each cycle dispatches a cross-chain message via **Axelar GMP** to a **Uniswap v3** swap on **Ethereum Sepolia**.

CLI key: `cross-chain-dca` (branch `templates/cross-chain-dca`).

```
Hedera (DcaOrchestrator)
  └─ Schedule Service precompile (0x16b)
  └─ Axelar Gateway → callContract("ethereum-sepolia", ...)
        └─ Sepolia (DcaExecutor) → Uniswap v3 exactInputSingle
```

> **Educational / unaudited.** Testnets and small amounts only. Swap proceeds accumulate in `DcaExecutor` on Sepolia — only the deployer can withdraw via `yarn hardhat:sepolia:withdraw:executor`.

General Scaffold-HBAR docs: [Scaffold HBAR on Hedera](https://docs.hedera.com/solutions/tools/scaffold-hbar/index). Contract layout, scripts, and env vars: [packages/hardhat/README.md](packages/hardhat/README.md).

## What's in this template

- **Hardhat-only** monorepo (Hedera + Sepolia contracts and scripts)
- Next.js DCA dashboard at `/dca` (create/cancel plans, execution log)
- One-command deploy: `yarn hardhat:deploy` (10 steps: compile, deploy both chains, wire, fund, plan, verify)

Create a project:

```bash
npm create scaffold-hbar@latest -- --template cross-chain-dca
```

This template deploys to **live testnets only** — not a local Hardhat chain.

## Quick start



### Prerequisites

- Node.js ≥ 20.18.3, Yarn (Corepack), Git
- Hedera testnet account — [portal.hedera.com](https://portal.hedera.com)
- Sepolia RPC (e.g. Alchemy), Sepolia ETH, Sepolia USDC ([faucet.circle.com](https://faucet.circle.com/))
- Etherscan API key for Sepolia verification



### Install and deploy

```bash
yarn install

yarn hardhat:account:generate   # once for Hedera, once for Sepolia — fund both

yarn hardhat:deploy             # interactive: RPC, keys, full 10-step deploy

yarn next:dev                   # http://localhost:3000/dca
```

Manual step-by-step commands, plan variables, withdraw scripts, and tests: [packages/hardhat/README.md](packages/hardhat/README.md).

## Project layout

- **packages/hardhat** — `DcaOrchestrator`, `AxelarMessageSender`, `DcaExecutor`, `AxelarMessageReceiver`, deploy/wire/fund scripts
- **packages/nextjs** — DCA UI, wagmi, RainbowKit



## Links

- [Scaffold HBAR docs](https://docs.hedera.com/solutions/tools/scaffold-hbar/index)
- [create-scaffold-hbar](https://github.com/hedera-dev/create-scaffold-hbar) — CLI
- [Axelar docs](https://docs.axelar.dev/)
- [Hedera Portal faucet](https://portal.hedera.com/faucet)
- [HashScan testnet](https://hashscan.io/testnet)

