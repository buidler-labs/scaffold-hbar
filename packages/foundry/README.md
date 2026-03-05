# Foundry package (Hedera)

Solidity contracts, Forge scripts, and tests for the Hedera EVM.

## Deploy

- **Local (Hedera fork):** Start the chain (`yarn chain` from repo root), then `yarn deploy` (default network: localhost). Uses the default keystore `scaffold-eth-default` (prefunded on the fork).
- **Hedera testnet/mainnet:** Use `yarn deploy --network hedera_testnet` (or `hedera_mainnet`). You **must** use a keystore whose address is a **Hedera-created account** (created and funded via [Hedera Portal](https://portal.hedera.com) or faucet). If you see `Requested resource not found. address '0x...'`, that address does not exist on Hedera—create an account with an ECDSA key, import it with `yarn account:import`, then deploy with `--keystore <name>`. For multi-contract deploys, the Makefile uses `--slow` so each transaction is confirmed before the next (avoids `WRONG_NONCE` on Hedera when both txs are in flight).

## Tests

- **`yarn test`** (or `forge test`) – Runs tests on a **local Anvil** chain.  
  - **HederaToken** (ERC-20) tests pass.  
  - **HtsTokenCreator** (HTS precompile) tests **revert** – Anvil has no HTS precompile.

- **`yarn test:fork:local`** (or `forge test --fork-url http://127.0.0.1:8545 --chain-id 296`) – Runs tests against the **same Hedera fork** as Hardhat.  
  - All tests, including **HtsTokenCreator**, pass.  
  - **Requirement:** Start the Hedera fork first from the repo root:  
    ```bash
    yarn chain
    ```  
    Then in another terminal:  
    ```bash
    yarn foundry:test:fork:local
    ```  
    (Or from this package: `yarn test:fork:local`.)

- **`yarn test:fork`** – Forks from Hedera testnet RPC (`HEDERA_RPC_URL` or default).  
  - Useful for other checks; HtsTokenCreator tests may still fail depending on RPC/fork behavior.

## Summary

| Command                 | Chain        | HederaToken | HtsTokenCreator |
|-------------------------|-------------|-------------|-----------------|
| `yarn test`             | Anvil       | ✅          | ❌              |
| `yarn test:fork:local`  | Local fork* | ✅          | ✅              |
| `yarn test:fork`        | Testnet RPC | ✅          | ⚠️              |

\* Run `yarn chain` first (Hardhat + `@hashgraph/system-contracts-forking`).


