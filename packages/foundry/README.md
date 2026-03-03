# Foundry package (Hedera)

Solidity contracts, Forge scripts, and tests for the Hedera EVM.

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
