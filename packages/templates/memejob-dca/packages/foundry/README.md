# Foundry package (Hedera)

Solidity contracts, Forge scripts, and tests for the Hedera EVM.

## Deploy

- **Local (Hedera fork):** Start the chain (`yarn chain` from repo root), then `yarn deploy` (default network: localhost). Uses the default keystore `scaffold-eth-default` (prefunded on the fork).
- **Hedera testnet/mainnet:** Use `yarn deploy --network hedera_testnet` (or `hedera_mainnet`). You **must** use a keystore whose address is a **Hedera-created account** (created and funded via [Hedera Portal](https://portal.hedera.com) or faucet). If you see `Requested resource not found. address '0x...'`, that address does not exist on Hedera—create an account with an ECDSA key, import it with `yarn account:import`, then deploy with `--keystore <name>`. For multi-contract deploys, the Makefile uses `--slow` so each transaction is confirmed before the next (avoids `WRONG_NONCE` on Hedera when both txs are in flight).

## Tests

- **`yarn test`** (or `forge test`) – Runs tests on a **local Anvil** chain.  
  - **HederaToken** (ERC-20) tests pass.  
  - **HtsTokenCreator** (HTS precompile) tests are **skipped** – these tests only run on Hedera fork/testnet/mainnet chains.

- **`yarn test:local`** (or `forge test --fork-url http://127.0.0.1:8545 --chain-id 296 --ffi`) – Runs tests against the **same Hedera fork** as Hardhat.  
  - All tests, including **HtsTokenCreator**, pass.  
  - **Requirement:** Start the Hedera fork first from the repo root:  
  ```bash
  yarn chain
  ```  
  Then in another terminal:  
  ```bash
  yarn foundry:test:local
  ```  
  (Or from this package: `yarn test:local`.)

- **`yarn test:testnet`** – Fork from Hedera testnet RPC (`HEDERA_RPC_URL` or default) with [hedera-forking](https://github.com/hashgraph/hedera-forking) HTS emulation enabled via `htsSetup()`.  
- **`yarn test:mainnet`** – Fork from Hedera mainnet RPC (for read-only checks and HTS behavior snapshots).

## Summary

| Command            | Chain        | HederaToken | HtsTokenCreator |
|--------------------|-------------|-------------|-----------------|
| `yarn test`        | Anvil       | ✅          | ⏭️ (skipped)    |
| `yarn test:local`  | Local fork* | ✅          | ✅              |
| `yarn test:testnet`| Testnet RPC | ✅          | ✅              |
| `yarn test:mainnet`| Mainnet RPC | ✅          | ✅ (read-only)  |

\* Run `yarn chain` first (Hardhat + `@hashgraph/system-contracts-forking`).

For more details on how fork testing with HTS emulation works, see the Hedera docs on [forking the Hedera network for local testing](https://docs.hedera.com/hedera/core-concepts/smart-contracts/forking-hedera-network-for-local-testing).


