# Scaffold-HBAR — Payments scheduler (Hedera)

A Hedera-ready monorepo for building dApps with **Next.js**, **Foundry**, and Hedera networks (testnet, mainnet). This repository is the source for [create-hbar](https://github.com/buidler-labs/create-hbar) templates; **it** uses the **Foundry** stack and ships the **payments-scheduler** pattern: a generic **ScheduledVault** plus pluggable strategies (example: DCA) driven by the **Hedera Schedule Service (HSS)**.

### Target networks: Hedera testnet and mainnet

These contracts are **meant for Hedera testnet and mainnet** (use at your own risk). **Schedule Service is not supported on Hedera forks**, so local or forked RPC cannot validate real schedule execution—only testnet/mainnet can. Forge tests (mock HSS) and fork options are in [`packages/foundry/README.md`](packages/foundry/README.md).

## Disclaimer

This template—including **contracts, frontend, and tooling**—is **experimental** and **not audited**. Do not use it in production without proper security review and your own due diligence.

## Prerequisites

- [Node.js](https://nodejs.org/) **>= 20.18.3**
- [Yarn](https://yarnpkg.com/)
- [Git](https://git-scm.com/)
- [Foundry](https://book.getfoundry.sh/getting-started/installation): `forge`, `cast`, `anvil`

After cloning, install JS dependencies from the repo root. In `packages/foundry`, install Solidity dependencies once (see [`packages/foundry/README.md`](packages/foundry/README.md)):

```bash
forge install foundry-rs/forge-std gnsps/solidity-bytes-utils hashgraph/hedera-forking
```

## How to start

From the repository root:

1. **Install**

   ```bash
   yarn install
   ```

   In `packages/foundry`, run `forge install` once as described under [Prerequisites](#prerequisites).

2. **Deploy on Hedera testnet** — use a keystore with a **Hedera-created** account and fund it via the [Hedera Portal faucet](https://portal.hedera.com/faucet) (see [`packages/foundry/README.md`](packages/foundry/README.md) for keystores and flags):

   ```bash
   yarn deploy --network hedera_testnet
   ```

   This compiles, broadcasts the default deploy script, and regenerates [`packages/nextjs/contracts/deployedContracts.ts`](packages/nextjs/contracts/deployedContracts.ts).

3. **App**

   ```bash
   yarn start
   ```

Open [http://localhost:3000](http://localhost:3000), connect a wallet on **Hedera testnet**, and use **Debug Contracts** (`/debug`) or **DCA** (`/dca`) against the addresses you deployed.


**Useful commands:** `yarn compile`, `yarn test`, `yarn lint`, `yarn format`, `yarn next:build`. Accounts: `yarn generate`, `yarn account:import`, `yarn account`.

## How to use this template

A practical order that matches how teams usually iterate:

### 1. Customize contracts

- **Core contracts** live in [`packages/foundry/contracts/`](packages/foundry/contracts/): `ScheduledVault`, `ScheduledVaultFactory`, and strategies under `contracts/strategies/` (the **Memejob** DCA strategy is an **example** — copy the pattern for your own `IExecutionStrategy`).
- **Deploy scripts** are in [`packages/foundry/script/`](packages/foundry/script/) (e.g. `Deploy.s.sol`, or split scripts like `DeployFactory.s.sol`).
- **Networks and RPCs** are configured in [`packages/foundry/foundry.toml`](packages/foundry/foundry.toml) and, for the app, [`packages/nextjs/scaffold.config.ts`](packages/nextjs/scaffold.config.ts).

### 2. Compile

```bash
yarn compile
```

### 3. Test

```bash
yarn test
```


### 4. Deploy

Deploy to **Hedera testnet** or **mainnet** as in [How to start](#how-to-start). Keystores, `--keystore`, and split deploy scripts (`DeployFactory.s.sol`, etc.) are covered in [`packages/foundry/README.md`](packages/foundry/README.md).

`yarn deploy` also runs ABI generation (see `packages/foundry/scripts-js/generateTsAbis.js`) so the UI stays in sync with `broadcast/` / deployments.

### 5. Verify (optional, on Hashscan)

```bash
yarn verify:testnet   # chain 296
yarn verify:mainnet   # chain 295
```

Verified contracts appear on [Hashscan (testnet)](https://hashscan.io/testnet) and [Hashscan (mainnet)](https://hashscan.io/mainnet)

## Customizing the UI and wiring your contracts

### Integrate contracts in the frontend

- **Generated contract metadata** for hooks is in [`packages/nextjs/contracts/deployedContracts.ts`](packages/nextjs/contracts/deployedContracts.ts) (updated after deploy). Manually curated addresses/ABIs go in [`packages/nextjs/contracts/externalContracts.ts`](packages/nextjs/contracts/externalContracts.ts).
- Use hooks from [`packages/nextjs/hooks/scaffold-hbar`](packages/nextjs/hooks/scaffold-hbar): `useScaffoldReadContract`, `useScaffoldWriteContract`, `useScaffoldEventHistory`, etc.

### Debug and iterate quickly

- **`/debug`** — auto-generated contract UIs from the scaffold; ideal for calling any deployed function without building a custom screen first.
- **Browser + wallet** — connect with RainbowKit; ensure the app target network in `scaffold.config.ts` matches where you deployed.
- **Contract logs / explorer** — use [Hashscan](https://hashscan.io/) for testnet and mainnet transactions.

### Build product-specific UI

- App routes live under [`packages/nextjs/app/`](packages/nextjs/app/) (App Router). The **DCA** example is [`packages/nextjs/app/dca/page.tsx`](packages/nextjs/app/dca/page.tsx) with components such as `CreateVaultCard`, `DepositSection`, `ScheduleControls`, etc.
- **Navigation:** add links in [`packages/nextjs/components/Header.tsx`](packages/nextjs/components/Header.tsx) (`menuLinks`).
- **Styling:** prefer **DaisyUI** component classes over one-off Tailwind.
- **@scaffold-hbar-ui/components** — use `Address`, `Balance`, `HederaAddressInput`, and related components for consistent web3 UX.

## Use cases and how to customize them

| Use case | What the template gives you | Typical customization |
| -------- | ---------------------------- | --------------------- |
| **Recurring on-chain actions** | Vault + HSS reschedule loop | Adjust vault parameters, failure handling, and strategy `plan()` / config encoding |
| **DCA / scheduled swaps** | Example MemeJob strategy + DCA page | Replace strategy with your DEX/router logic; reshape UI forms to your config struct |
| **Payment or allowance schedules** | Same vault abstraction | New `IExecutionStrategy` that returns `Action[]` for transfers or approvals |
| **Learning / demo** | Debug page + block explorer routes | Strip or replace example branding; add your own pages only |

**Strategies:** Implement `IExecutionStrategy` (`validateConfig`, `plan`), deploy it, and point new vaults from `ScheduledVaultFactory.createVault(strategy)`. Encode config off-chain the same way your Solidity decodes it (see Foundry README **Adding a new execution strategy**).

## Project layout

- **`packages/foundry`** — Solidity, Forge scripts, tests, keystore helpers, Hedera verify scripts
- **`packages/nextjs`** — Next.js app, Wagmi/RainbowKit, scaffold hooks, `scaffold.config.ts

## Links

- [Hedera Documentation](https://docs.hedera.com/)
- [Hedera Schedule Service](https://docs.hedera.com/hedera/core-concepts/smart-contracts/system-smart-contracts/hedera-schedule-service)
- [Hashscan](https://hashscan.io/)
- [create-hbar](https://github.com/buidler-labs/create-hbar)

## License

Open source under the [MIT License](https://opensource.org/licenses/MIT). Solidity sources in `packages/foundry/contracts` use `SPDX-License-Identifier: MIT` unless a file states otherwise.
