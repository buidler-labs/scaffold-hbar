# Foundry package (Hedera)

Solidity contracts, Forge scripts, and tests for the Hedera EVM.

## Setup

Forge dependencies are not committed to the repo. Install them locally from this package:

```bash
cd packages/foundry
forge install foundry-rs/forge-std gnsps/solidity-bytes-utils hashgraph/hedera-forking
```

(OpenZeppelin contracts are provided via `node_modules`; install with `yarn` from the repo root.)

---

## Deploy (Foundry)

From the repo root, contract deploys for this package use **`yarn foundry:deploy`** (runs `packages/foundry`’s deploy script). Inside `packages/foundry`, use **`yarn deploy`** (same entrypoint).

- **Local (fork on chain id 296):** Start an Anvil fork against Hedera testnet, then deploy with `--network localhost` (RPC `http://127.0.0.1:8545`).

  ```bash
  cd packages/foundry
  yarn fork
  ```

  In another terminal (from repo root or this package):

  ```bash
  yarn foundry:deploy --network localhost
  ```

  `make fork` is equivalent to `yarn fork` (see `Makefile`). This uses the default keystore `scaffold-eth-default` where applicable (see `Makefile` / `parseArgs.js`).

- **Plain Anvil (no Hedera fork):** `yarn chain` in this package runs plain `anvil`—useful for quick iteration, not for full Hedera/HTS parity.

- **Hedera testnet/mainnet:** Use `yarn foundry:deploy --network hedera_testnet` (or `hedera_mainnet`). You **must** use a keystore whose address is a **Hedera-created account** (created and funded via [Hedera Portal](https://portal.hedera.com) or faucet). If you see `Requested resource not found. address '0x...'`, that address does not exist on Hedera—create an account with an ECDSA key, import it with `yarn account:import`, then deploy with `--keystore <name>`. For multi-contract deploys, the Makefile uses `--slow` so each transaction is confirmed before the next (avoids `WRONG_NONCE` on Hedera when both txs are in flight).

---

## Tests (Foundry)

- **`yarn test`** (or `forge test`) – Runs tests on a **local Anvil** chain (no Hedera fork).  
  - **HederaToken** (ERC-20) tests pass.  
  - **HtsTokenCreator** (HTS precompile) tests are **skipped** – these need a Hedera fork or live RPC.

- **`yarn test:local`** (or `forge test --fork-url http://127.0.0.1:8545 --chain-id 296 --ffi`) – Runs tests against whatever serves **JSON-RPC on 127.0.0.1:8545** with **chain id 296**.

  **Foundry-first setup (recommended here):**

  ```bash
  cd packages/foundry
  yarn fork
  ```

  Then in another terminal from the repo root:

  ```bash
  yarn foundry:test:local
  ```

  Or from this package: `yarn test:local`.

  **Optional:** If you use the monorepo’s **Hardhat** local node instead (`yarn chain` from the repo root), it also listens on `:8545` with chain id 296 for the same `test:local` command—that is the Hardhat stack, not Foundry. See [`packages/hardhat/README.md`](../hardhat/README.md).

- **`yarn test:testnet`** – Fork from Hedera testnet RPC (`HEDERA_RPC_URL` or default) with [hedera-forking](https://github.com/hashgraph/hedera-forking) HTS emulation via `htsSetup()` where applicable.

- **`yarn test:mainnet`** – Fork from Hedera mainnet RPC (read-only / snapshot style checks).

---

## Summary

| Command             | Chain        | HederaToken | HtsTokenCreator |
| ------------------- | ------------ | ----------- | --------------- |
| `yarn test`         | Anvil        | ✅          | ⏭️ (skipped)    |
| `yarn test:local`   | Local fork\* | ✅          | ✅              |
| `yarn test:testnet` | Testnet RPC  | ✅          | ✅              |
| `yarn test:mainnet` | Mainnet RPC  | ✅          | ✅ (read-only)  |

\* **Foundry path:** run `yarn fork` in `packages/foundry` first (Anvil forking Hedera testnet). **Alternative:** Hardhat `yarn chain` from repo root—see Hardhat README.

For more on fork testing with HTS emulation, see [forking the Hedera network for local testing](https://docs.hedera.com/hedera/core-concepts/smart-contracts/forking-hedera-network-for-local-testing).
