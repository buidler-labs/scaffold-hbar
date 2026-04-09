# Hardhat package (Hedera)

Hardhat config, contracts, deploy scripts, tests, and Hashscan verification for this monorepo.

## Local development

Root scripts delegate to this package via the `@sh/hardhat` workspace (e.g. `yarn chain` → `hardhat:chain`).

1. **Start the local chain** (terminal 1, from repo root):
   ```bash
   yarn chain
   ```
   This starts `hardhat node` with **Hedera testnet forking** (`HEDERA_FORKING=true` and `@hashgraph/system-contracts-forking`). JSON-RPC is served at **http://127.0.0.1:8545**.

2. **Deploy to the running fork** (terminal 2):
   ```bash
   yarn deploy --network localhost
   ```
   Use **`localhost`** so Hardhat connects to the long-running node on port 8545.

   **`yarn deploy` without `--network`** uses the default network `hardhat`, which is the **in-process ephemeral** Hardhat network—**not** the same process as `yarn chain`. For deploys against the forked node you started in step 1, always pass **`--network localhost`** while that node is running.

3. **Run contract tests** (from repo root; tests use `HEDERA_FORKING=true` and can run against the fork or standalone):
   ```bash
   yarn test
   ```
   Equivalent:
   ```bash
   yarn hardhat:test
   ```

## Deploy and verify on Hedera testnet/mainnet

You need a deployer account with HBAR on the target network. Without funds, deploy and verify will fail with "Sender account not found".

1. **Generate or import an account** (from repo root or this package):
   ```bash
   yarn generate
   ```
   or
   ```bash
   yarn account:import
   ```
   The encrypted key is stored in `packages/hardhat/.env`.

2. **Fund the account on testnet:**  
   Use the [Hedera Portal faucet](https://portal.hedera.com/faucet) to receive testnet HBAR.

3. **Deploy to Hedera testnet** (from repo root):
   ```bash
   yarn deploy --network hederaTestnet
   ```
   or
   ```bash
   yarn deploy --network hedera_testnet
   ```
   You will be prompted to enter the password to decrypt your deployer key.

4. **Verify on Hashscan** (uses deployment JSON under `deployments/<network>/`, which includes compiler metadata and sources):
   ```bash
   yarn verify:testnet   # all contracts on chain 296
   yarn verify:mainnet   # all contracts on chain 295
   yarn workspace @sh/hardhat verify:contract -- HederaToken testnet
   yarn workspace @sh/hardhat verify:contract -- HederaToken testnet 0xYourContractAddress
   ```

## Layout

- `contracts/` — Solidity sources
- `deploy/` — hardhat-deploy scripts (e.g. `00_deploy_hedera_token.ts`)
- `scripts/` — generateAccount, importAccount, verifyHedera.js, etc.
- `test/` — contract tests
- `hardhat.config.ts` — networks (`hardhat`, `localhost` for RPC at 127.0.0.1:8545, `hederaTestnet`, `hederaMainnet`)

Network and RPC URLs are in `hardhat.config.ts`. Deployer key is read from `.env` (encrypted) and decrypted at deploy time for live networks.
