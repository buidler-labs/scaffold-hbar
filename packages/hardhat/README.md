# Hardhat package (Hedera)

Hardhat config, contracts, deploy scripts, tests, and Hashscan verification for this monorepo.

**Proof Wall (hedera-demo) template:** This branch focuses on the native Hedera demo app. The frontend uses HCS and HTS via the Hedera SDK; no smart contracts are required. This package remains available for optional contract work but is not used by the Proof Wall demo.

## Local development

1. **Start the local chain** (terminal 1):
   ```bash
   yarn chain
   ```
   This runs a Hedera testnet fork.

2. **Deploy to the local fork** (terminal 2):
   ```bash
   yarn deploy --network hardhat
   ```
   Deploying without `--network` may use the default; use `--network hardhat` to target the local node explicitly.

3. **Run contract tests** (with the chain running):
   ```bash
   yarn test
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

4. **Verify on Hashscan** (no extra arguments; uses last deployment artifacts):
   ```bash
   yarn verify:testnet   # chain 296
   yarn verify:mainnet   # chain 295
   ```

## Layout

- `contracts/` — Solidity sources
- `deploy/` — hardhat-deploy scripts (e.g. `00_deploy_hedera_token.ts`)
- `scripts/` — generateAccount, importAccount, verifyHedera.js, etc.
- `test/` — contract tests
- `hardhat.config.ts` — networks (hardhat, hederaTestnet, hedera_testnet, hederaMainnet)

Network and RPC URLs are in `hardhat.config.ts`. Deployer key is read from `.env` (encrypted) and decrypted at deploy time for live networks.
