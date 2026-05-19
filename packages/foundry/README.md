# Foundry package (Hedera)

Solidity contracts, Forge scripts, and tests for the Hedera EVM.

## Oracle Core Architecture

This project contains the provider-agnostic oracle foundation for the Hedera Foundry template.

### Normalized Price Interface

Every provider adapter implements `IPriceOracle`.

`latestPrice()` returns one `PriceData` struct:

- `pairKey`: deterministic key for the configured `BASE/QUOTE` pair.
- `providerKey`: deterministic key for the oracle provider.
- `priceE18`: price of one whole base asset in quote asset units, scaled to 18 decimals.
- `updatedAt`: upstream oracle update timestamp in seconds.

### Pair And Provider Keys

A Solidity library is reusable code deployed without its own persistent storage. In this project, libraries keep
shared key and conversion logic in one place so adapters, registries, and consumers use the same rules.

`PairLib` derives pair keys with:

```text
keccak256(abi.encode(baseSymbol, quoteSymbol))
```

Symbols are expected to be canonical uppercase values such as `HBAR`, `BTC`, `ETH`, and `USD`.
The library does not uppercase symbols for callers, so casing differences intentionally produce different keys.

`ProviderLib` exposes deterministic provider keys for:

- `CHAINLINK`
- `SUPRA`
- `PYTH`

### Asset Conversion

`AssetConversionLib` converts smallest-unit amounts using normalized oracle prices.

For `baseToQuote`:

```text
quoteAmount = baseAmount * (10 ** quoteDecimals) / (10 ** baseDecimals) * priceE18 / 1e18
```

For `quoteToBase`:

```text
baseAmount = quoteAmount * (10 ** baseDecimals) / (10 ** quoteDecimals) * 1e18 / priceE18
```

The library uses OpenZeppelin `Math.mulDiv` and rounds down when a conversion leaves a remainder.
It rejects zero prices. Decimal validation is intentionally left to template users and future adapters.

### Oracle Registry

`OracleRegistry` maps:

```text
pairKey + providerKey -> adapter address
```

Only the owner can register, replace, or remove adapters.
During registration, the registry calls `latestPrice()` on the adapter and checks that the adapter reports the
same `pairKey` and `providerKey` requested by the owner.

Consumers can either:

- call `getOracle(pairKey, providerKey)` and read the adapter directly, or
- call `latestPrice(pairKey, providerKey)` for a registry passthrough read.

### Chainlink Deployment Config

`script/HelperConfig.s.sol` stores Chainlink Data Feed addresses used by deployment scripts:

| Network         | HBAR/USD                                     | BTC/USD                                      | ETH/USD                                      |
| --------------- | -------------------------------------------- | -------------------------------------------- | -------------------------------------------- |
| Hedera Mainnet  | `0xAF685FB45C12b92b5054ccb9313e135525F9b5d5` | `0xaD01E27668658Cc8c1Ce6Ed31503D75F31eEf480` | `0xd2D2CB0AEb29472C3008E291355757AD6225019e` |
| Hedera Testnet  | `0x59bC155EB6c6C415fE43255aF66EcF0523c92B4a` | `0x058fE79CB5775d4b167920Ca6036B824805A9ABd` | `0xb9d461e0b962aF219866aDfA7DD19C52bB9871b9` |

Unsupported chains revert from `getConfigByChainId`.

Chainlink fork tests use the real feed addresses and are excluded from the default test suite:

```bash
FOUNDRY_PROFILE=integration forge test --fork-url https://testnet.hashio.io/api --match-path test/integration/ChainlinkPriceOracleAdapterFork.t.sol
```

## Setup

Forge dependencies are tracked as git submodules under `packages/foundry/lib`.
Initialize them from the repo root:

```bash
git submodule update --init --recursive
```

---

## Deploy (Foundry)

From the repo root, contract deploys for this package use **`yarn foundry:deploy`** (runs `packages/foundry`’s deploy script). Inside `packages/foundry`, use **`yarn deploy`** (same entrypoint).

- **Local (recommended):** Start the shared local chain from the repo root, then deploy with `--network localhost` (RPC `http://127.0.0.1:8545`).

  ```bash
  yarn hardhat:chain
  ```

  In another terminal (from repo root or this package):

  ```bash
  yarn foundry:deploy --network localhost
  ```

  This uses the default keystore `scaffold-hbar-default` where applicable (see `Makefile` / `parseArgs.js`).
  The deploy flow auto-creates the local `deployments/` directory before writing `deployments/<chainId>.json`.

- **Plain Anvil (no Hedera fork):** `yarn chain` inside `packages/foundry` runs plain `anvil`—useful for quick iteration, not for full Hedera/HTS parity.

- **Hedera testnet/mainnet:** Use `yarn foundry:deploy --network hedera_testnet` (or `hedera_mainnet`). You **must** use a keystore whose address is a **Hedera-created account** (created and funded via [Hedera Portal](https://portal.hedera.com) or faucet). If you see `Requested resource not found. address '0x...'`, that address does not exist on Hedera. From the repo root, create or import one with `yarn foundry:account:generate` or `yarn foundry:account:import`, then deploy with `--keystore <name>`. For multi-contract deploys, the Makefile uses `--slow` so each transaction is confirmed before the next (avoids `WRONG_NONCE` on Hedera when both txs are in flight).

---

## Tests (Foundry)

- **`yarn test`** inside `packages/foundry` (or `forge test`) – Runs tests on a **local Anvil** chain (no Hedera fork).  
  - **HederaToken** (ERC-20) tests pass.  
  - **HtsTokenCreator** (HTS precompile) tests are **skipped** – these need a Hedera fork or live RPC.

- **`yarn test:local`** inside `packages/foundry` (or `forge test --fork-url http://127.0.0.1:8545 --chain-id 296 --ffi`) – Runs tests against whatever serves **JSON-RPC on 127.0.0.1:8545** with **chain id 296**.

  **Local setup:**

  ```bash
  yarn hardhat:chain
  ```

  Then in another terminal from the repo root:

  ```bash
  yarn foundry:test:local
  ```

  Or from this package: `yarn test:local`.

  This command attaches to the shared local JSON-RPC at `:8545`.

- **`yarn test:testnet`** inside `packages/foundry` – Fork from Hedera testnet RPC (`HEDERA_RPC_URL` or default) with [hedera-forking](https://github.com/hashgraph/hedera-forking) HTS emulation via `htsSetup()` where applicable.

- **`yarn test:mainnet`** inside `packages/foundry` – Fork from Hedera mainnet RPC (read-only / snapshot style checks).

---

## Summary

| Command             | Chain        | HederaToken | HtsTokenCreator |
| ------------------- | ------------ | ----------- | --------------- |
| `yarn test`         | Anvil        | ✅          | ⏭️ (skipped)    |
| `yarn test:local`   | Local fork\* | ✅          | ✅              |
| `yarn test:testnet` | Testnet RPC  | ✅          | ✅              |
| `yarn test:mainnet` | Mainnet RPC  | ✅          | ✅ (read-only)  |

\* Run `yarn hardhat:chain` from the repo root first.

For more on fork testing with HTS emulation, see [forking the Hedera network for local testing](https://docs.hedera.com/hedera/core-concepts/smart-contracts/forking-hedera-network-for-local-testing).
