# Foundry package (Hedera)

Solidity contracts, Forge scripts, and tests for the Hedera EVM.

## Oracle Core Architecture

This project contains the provider-agnostic oracle foundation for the Hedera Foundry template.

The intended flow is:

```text
Provider feed -> Provider adapter -> OracleRegistry -> Consumer contract
```

Provider adapters normalize provider-specific price data into one shared `IPriceOracle` shape. Consumers can then
read prices from `OracleRegistry` without knowing whether the price came from Chainlink, Supra, Pyth, or another
adapter.

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

### Oracle Consumer Demo

`OracleConsumer` is a demo contract that shows one way to use this template. It is not required infrastructure.

The demo reads a normalized price through `OracleRegistry`, then uses `AssetConversionLib` to expose:

- `baseToQuote(...)`
- `quoteToBase(...)`

Use it as a reference when building your own consumer contract. A real app can copy the same pattern and add its
own business logic, permissions, payments, or accounting rules.

### Chainlink Deployment Config

`script/HelperConfig.s.sol` stores oracle provider addresses used by deployment scripts. Chainlink feed addresses
are grouped under `config.chainlink`:

| Network         | HBAR/USD                                     | BTC/USD                                      | ETH/USD                                      |
| --------------- | -------------------------------------------- | -------------------------------------------- | -------------------------------------------- |
| Hedera Mainnet  | `0xAF685FB45C12b92b5054ccb9313e135525F9b5d5` | `0xaD01E27668658Cc8c1Ce6Ed31503D75F31eEf480` | `0xd2D2CB0AEb29472C3008E291355757AD6225019e` |
| Hedera Testnet  | `0x59bC155EB6c6C415fE43255aF66EcF0523c92B4a` | `0x058fE79CB5775d4b167920Ca6036B824805A9ABd` | `0xb9d461e0b962aF219866aDfA7DD19C52bB9871b9` |

Unsupported chains revert from `getConfigByChainId`.

`script/DeployChainlinkOracle.s.sol` deploys:

- `OracleRegistry`
- one `ChainlinkPriceOracleAdapter` for each configured pair
- `OracleConsumer` as a demo consumer

It also registers the Chainlink adapters in `OracleRegistry`.
The deploy wrapper runs `forge script` with `--broadcast`, so these commands send transactions and then export the
deployed addresses to `deployments/<chainId>.json`.

Deploy the Chainlink oracle demo on Hedera Testnet:

```bash
yarn deploy --file DeployChainlinkOracle.s.sol --network hedera_testnet
```

For mainnet, use:

```bash
yarn deploy --file DeployChainlinkOracle.s.sol --network hedera_mainnet
```

Chainlink fork tests use the real feed addresses and are excluded from the default test suite:

```bash
FOUNDRY_PROFILE=integration forge test --fork-url https://testnet.hashio.io/api --match-path test/integration/ChainlinkPriceOracleAdapterFork.t.sol
```

### Supra Research Config

`script/HelperConfig.s.sol` also stores the currently validated Supra Push Oracle config under `config.supra`.
This is deployment/script configuration only; the Supra adapter is not implemented yet.

| Network        | Push oracle                                  |
| -------------- | -------------------------------------------- |
| Hedera Mainnet | `0xD02cc7a670047b6b012556A88e275c685d25e0c9` |
| Hedera Testnet | `0x6Cd59830AAD978446e6cc7f6cc173aF7656Fb917` |

Default Supra pair IDs:

| Pair     | Supra pair ID | Category       |
| -------- | ------------- | -------------- |
| BTC/USD  | `18`          | Supra Standard |
| ETH/USD  | `19`          | Supra Standard |
| HBAR/USD | `432`         | Supra Standard |


### End-To-End Chainlink Flow

Use this checklist from `packages/foundry` when deploying the Chainlink oracle template to Hedera. For a fresh
clone, run the workspace setup from the root README first.

1. Create or import a Foundry keystore account:

   ```bash
   yarn account:generate
   # or
   yarn account:import
   ```

2. Fund that Hedera account with testnet HBAR from the [Hedera Portal faucet](https://portal.hedera.com/faucet).

3. Compile the contracts:

   ```bash
   yarn compile
   ```

4. Run deterministic unit tests:

   ```bash
   yarn test
   ```

5. Run the Chainlink fork smoke test against real Hedera Testnet feed addresses:

   ```bash
   yarn test:chainlink:testnet
   ```

6. Deploy and register the Chainlink oracle template on Hedera Testnet:

   ```bash
   yarn deploy:chainlink:testnet
   ```

   The deploy command prompts for a keystore unless one is provided. To select one explicitly:

   ```bash
   yarn deploy --file DeployChainlinkOracle.s.sol --network hedera_testnet --keystore <keystore-name>
   ```

7. Check the exported deployment file:

   ```bash
   cat deployments/296.json
   ```

   The file should include `OracleRegistry`, `OracleConsumer`, and the three Chainlink adapter addresses.

8. Read the deployed Chainlink oracle data and demo conversions:

   ```bash
   yarn read:chainlink:testnet
   ```

   This read-only script loads `deployments/296.json`, reads prices through `OracleRegistry`, and calls the
   `OracleConsumer` demo conversion helpers. It does not broadcast transactions.

9. Verify contracts on Hashscan when needed:

   ```bash
   yarn verify:testnet
   ```

For mainnet, use the same flow with `hedera_mainnet`, `yarn deploy:chainlink:mainnet`,
`yarn read:chainlink:mainnet`, and `yarn verify:mainnet`. Use a funded mainnet Hedera account and confirm every
feed address in `script/HelperConfig.s.sol` before broadcasting.

### Extending The Template

To add a new Chainlink pair:

1. Add the feed address to `script/HelperConfig.s.sol`.
2. Deploy one `ChainlinkPriceOracleAdapter` for that pair.
3. Register the adapter in `OracleRegistry` using `pairKey + ProviderLib.CHAINLINK`.
4. Read prices through `OracleRegistry` or follow the `OracleConsumer` demo pattern.

## Setup

Forge dependencies are tracked as git submodules under `packages/foundry/lib`.
Install workspace dependencies and initialize git submodules from the repo root. After that, run package commands
from `packages/foundry`.

---

## Deploy (Foundry)

From `packages/foundry`, contract deploys use **`yarn deploy`**.

- **Hedera testnet/mainnet:** Use `yarn deploy --network hedera_testnet` (or `hedera_mainnet`). You **must** use a keystore whose address is a **Hedera-created account** (created and funded via [Hedera Portal](https://portal.hedera.com) or faucet). If you see `Requested resource not found. address '0x...'`, that address does not exist on Hedera. Create or import one with `yarn account:generate` or `yarn account:import`, then deploy with `--keystore <name>`. For multi-contract deploys, the Makefile uses `--slow` so each transaction is confirmed before the next (avoids `WRONG_NONCE` on Hedera when both txs are in flight).

- **Chainlink oracle template:** Use the dedicated Makefile/Yarn shortcuts to deploy the registry, Chainlink adapters, and demo consumer:

  ```bash
  yarn deploy:chainlink:testnet
  yarn deploy:chainlink:mainnet
  ```

---

## Tests (Foundry)

- **`yarn test`** inside `packages/foundry` (or `forge test`) – Runs deterministic unit tests only.
  Integration tests under `test/integration` are excluded by default.

- **`yarn test:testnet`** inside `packages/foundry` – Fork from Hedera testnet RPC (`HEDERA_RPC_URL` or default) with [hedera-forking](https://github.com/hashgraph/hedera-forking) HTS emulation via `htsSetup()` where applicable.

- **`yarn test:mainnet`** inside `packages/foundry` – Fork from Hedera mainnet RPC (read-only / snapshot style checks).

- **Chainlink fork test:** run the real-feed adapter smoke test explicitly:

  ```bash
  yarn test:chainlink:testnet
  yarn test:chainlink:mainnet
  ```

For more on fork testing with HTS emulation, see [forking the Hedera network for local testing](https://docs.hedera.com/hedera/core-concepts/smart-contracts/forking-hedera-network-for-local-testing).
