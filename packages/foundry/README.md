# Foundry package (Hedera)

Solidity contracts, Forge scripts, and tests for the Hedera EVM.

## Oracle Core Architecture

This project contains the provider-agnostic oracle foundation for the Hedera Foundry template.

The intended flow is:

```text
Provider feed -> Multi-pair provider adapter -> Consumer contract
```

Provider adapters normalize provider-specific price data into one shared `IPriceOracle` shape. The default template
uses one selected provider adapter per consumer. To switch providers, deploy another adapter and call
`OracleConsumer.setOracle(newAdapter)`.

### Normalized Price Interface

Every provider adapter implements `IPriceOracle`.

`latestPrice(pairKey)` returns one `PriceData` struct:

- `pairKey`: deterministic key for the requested `BASE/QUOTE` pair.
- `providerKey`: deterministic key for the oracle provider.
- `priceE18`: price of one whole base asset in quote asset units, scaled to 18 decimals.
- `updatedAt`: upstream oracle update timestamp in seconds.

### Pair And Provider Keys

A Solidity library is reusable code deployed without its own persistent storage. In this project, libraries keep
shared key and conversion logic in one place so adapters and consumers use the same rules.

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

### Provider Adapters

The template deploys one adapter contract per provider:

- `ChainlinkPriceOracleAdapter`
- `SupraPriceOracleAdapter`
- `PythPriceOracleAdapter`

Each adapter supports multiple pairs in one deployment. Pair config is constructor-only:

- Chainlink maps `pairKey -> feed address`.
- Supra maps `pairKey -> Supra pair ID`.
- Pyth maps `pairKey -> Pyth price ID`.

Adapters reject empty configs, zero pair keys, duplicate pair keys, and zero upstream addresses or price IDs.
Unsupported pair reads revert with `OracleUnsupportedPair(pairKey)`.

### Oracle Consumer Demo

`OracleConsumer` is a demo contract that shows one way to use this template. It is not required infrastructure.

The demo stores one selected `IPriceOracle` adapter, then uses `AssetConversionLib` to expose:

- `baseToQuote(pairKey, baseAmount, baseDecimals, quoteDecimals)`
- `quoteToBase(pairKey, quoteAmount, baseDecimals, quoteDecimals)`

The owner can switch the selected provider with `setOracle(newAdapter)`.

Use it as a reference when building your own consumer contract. A real app can copy the same pattern and add its
own business logic, permissions, payments, or accounting rules.

### Consumer Deployment And Switching

Provider adapter deployment is separated from consumer deployment:

- deploy one provider adapter with `DeployChainlinkOracle.s.sol`, `DeploySupraOracle.s.sol`, or `DeployPythOracle.s.sol`
- deploy `OracleConsumer` once with `DeployOracleConsumer.s.sol`
- switch the existing consumer to another provider adapter with `SetConsumerOracle.s.sol`

`DeployOracleConsumer.s.sol` and `SetConsumerOracle.s.sol` resolve adapters from `deployments/<chainId>.json`.
Set `ORACLE_ADAPTER_NAME` to choose one of the exported adapter names, or set `ORACLE_ADAPTER_ADDRESS` directly.
If neither is set, the scripts use `ChainlinkPriceOracleAdapter`.

### Chainlink Deployment Config

`script/HelperConfig.s.sol` stores oracle provider addresses used by deployment scripts. Chainlink feed addresses
are grouped under `config.chainlink`:

| Network         | HBAR/USD                                     | BTC/USD                                      | ETH/USD                                      |
| --------------- | -------------------------------------------- | -------------------------------------------- | -------------------------------------------- |
| Hedera Mainnet  | `0xAF685FB45C12b92b5054ccb9313e135525F9b5d5` | `0xaD01E27668658Cc8c1Ce6Ed31503D75F31eEf480` | `0xd2D2CB0AEb29472C3008E291355757AD6225019e` |
| Hedera Testnet  | `0x59bC155EB6c6C415fE43255aF66EcF0523c92B4a` | `0x058fE79CB5775d4b167920Ca6036B824805A9ABd` | `0xb9d461e0b962aF219866aDfA7DD19C52bB9871b9` |

Unsupported chains revert from `getConfigByChainId`.

`script/DeployChainlinkOracle.s.sol` deploys:

- one `ChainlinkPriceOracleAdapter` for all configured pairs

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
This is deployment/script configuration only. Keep the constructor pair list limited to pairs that pass a fresh fork
smoke test on the target Hedera network.

| Network        | Push oracle                                  |
| -------------- | -------------------------------------------- |
| Hedera Mainnet | `0xD02cc7a670047b6b012556A88e275c685d25e0c9` |
| Hedera Testnet | `0x6Cd59830AAD978446e6cc7f6cc173aF7656Fb917` |

Default Supra pair IDs:

| Pair      | Supra pair ID | Hedera push status                           |
| --------- | ------------- | -------------------------------------------- |
| BTC/USDT  | `0`           | Confirmed live on Hedera testnet             |
| ETH/USDT  | `1`           | Confirmed live on Hedera testnet             |
| HBAR/USDT | `75`          | Confirmed live on Hedera testnet and mainnet |

The template uses the Supra push model only. Hedera's Supra documentation notes that mirror node payload limits make
single-pair reads safer than batched reads, so adapter and fork-test work should avoid batching upstream Supra calls.

`script/DeploySupraOracle.s.sol` deploys:

- one `SupraPriceOracleAdapter` for all configured `USDT` pairs

The deploy wrapper runs `forge script` with `--broadcast`, so these commands send transactions and then export the
deployed addresses to `deployments/<chainId>.json`.

Deploy the Supra oracle demo on Hedera Testnet:

```bash
yarn deploy --file DeploySupraOracle.s.sol --network hedera_testnet
```

For mainnet, use:

```bash
yarn deploy --file DeploySupraOracle.s.sol --network hedera_mainnet
```

Supra fork tests use real Hedera push oracle addresses and are excluded from the default test suite:

```bash
FOUNDRY_PROFILE=integration forge test --fork-url https://testnet.hashio.io/api --match-path test/integration/SupraPriceOracleAdapterFork.t.sol
```

### Pyth Research Config

`script/HelperConfig.s.sol` stores the currently validated Pyth contract and price IDs under `config.pyth`.
Pyth is a pull oracle, so its adapter flow is different from Chainlink and Supra: callers provide fresh Pyth update
data, pay the Pyth update fee, then read the normalized price.

| Network        | Pyth contract                               |
| -------------- | ------------------------------------------- |
| Hedera Mainnet | `0xA2aa501b19aff244D90cc15a4Cf739D2725B5729` |
| Hedera Testnet | `0xA2aa501b19aff244D90cc15a4Cf739D2725B5729` |

Default Pyth price IDs:

| Pair     | Price ID                                                           |
| -------- | ------------------------------------------------------------------ |
| HBAR/USD | `0x3728e591097635310e6341af53db8b7ee42da9b3a8d918f9463ce9cca886dfbd` |
| BTC/USD  | `0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43` |
| ETH/USD  | `0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace` |

`PythPriceOracleAdapter` follows the pull-update pattern from the Pyth EVM guide: calculate the update fee with
`getUpdateFee(updateData)`, call `updatePriceFeeds{ value: fee }(updateData)`, then read a fresh price with a
bounded staleness check.

`script/DeployPythOracle.s.sol` deploys:

- one `PythPriceOracleAdapter` for all configured `USD` pairs

It fetches fresh Hermes update data and updates each Pyth price feed individually before exporting deployments.
Single-feed updates avoid Hedera/Pyth batch payload edge cases during deployment. When the Pyth update fee is
non-zero but below Hedera's minimum native transfer amount, the deploy script sends one tinybar. The read script
uses the same rule before printing fresh adapter and consumer values.

Deploy the Pyth oracle demo on Hedera Testnet:

```bash
yarn deploy --file DeployPythOracle.s.sol --network hedera_testnet
```

For mainnet, use:

```bash
yarn deploy --file DeployPythOracle.s.sol --network hedera_mainnet
```

Read the deployed Pyth oracle demo on Hedera Testnet:

```bash
yarn read:pyth:testnet
```

This command prompts for a keystore because it broadcasts Pyth update transactions before reading prices. It fetches
fresh Hermes update data through `ffi`, updates each deployed adapter, then prints prices and `OracleConsumer` demo
conversions.

Pyth fork tests use real Hedera Pyth addresses and fetch fresh update data from Hermes through `ffi`, so they are
excluded from the default test suite:

```bash
FOUNDRY_PROFILE=integration forge test --fork-url https://testnet.hashio.io/api --ffi --match-path test/integration/PythPriceOracleAdapterFork.t.sol
```

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

6. Deploy the Chainlink adapter on Hedera Testnet:

   ```bash
   yarn deploy:chainlink:testnet
   ```

   The deploy command prompts for a keystore unless one is provided. To select one explicitly:

   ```bash
   yarn deploy --file DeployChainlinkOracle.s.sol --network hedera_testnet --keystore <keystore-name>
   ```

7. Deploy the consumer once, pointing at the Chainlink adapter:

   ```bash
   ORACLE_ADAPTER_NAME=ChainlinkPriceOracleAdapter yarn deploy:consumer:testnet
   ```

8. Check the exported deployment file:

   ```bash
   cat deployments/296.json
   ```

   The file should include `OracleConsumer` and `ChainlinkPriceOracleAdapter`.

9. Read the deployed Chainlink oracle data and demo conversions:

   ```bash
   yarn read:chainlink:testnet
   ```

   This read-only script loads `deployments/296.json`, reads prices through `ChainlinkPriceOracleAdapter`, and calls the
   `OracleConsumer` demo conversion helpers. It does not broadcast transactions.

10. Verify contracts with Sourcify when needed:

   ```bash
   yarn verify:testnet 0xContractAddress contracts/oracle/adapters/ChainlinkPriceOracleAdapter.sol:ChainlinkPriceOracleAdapter
   ```

For mainnet, use the same flow with `hedera_mainnet`, `yarn deploy:chainlink:mainnet`,
`yarn read:chainlink:mainnet`, and `yarn verify:mainnet 0xContractAddress contracts/oracle/adapters/ChainlinkPriceOracleAdapter.sol:ChainlinkPriceOracleAdapter`.
Use a funded mainnet Hedera account and confirm every feed address in `script/HelperConfig.s.sol` before broadcasting.
After Sourcify accepts the match, HashScan displays the verified status.

### End-To-End Supra Flow

Use this checklist from `packages/foundry` when deploying the Supra push oracle template to Hedera. For a fresh
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

5. Run the Supra fork smoke test against real Hedera Testnet push oracle data:

   ```bash
   yarn test:supra:testnet
   ```

6. Deploy the Supra adapter on Hedera Testnet:

   ```bash
   yarn deploy:supra:testnet
   ```

   The deploy command prompts for a keystore unless one is provided. To select one explicitly:

   ```bash
   yarn deploy --file DeploySupraOracle.s.sol --network hedera_testnet --keystore <keystore-name>
   ```

7. Deploy the consumer with Supra, or switch an existing consumer to Supra:

   ```bash
   ORACLE_ADAPTER_NAME=SupraPriceOracleAdapter yarn deploy:consumer:testnet
   # or, if OracleConsumer already exists:
   ORACLE_ADAPTER_NAME=SupraPriceOracleAdapter yarn set-oracle:testnet
   ```

8. Check the exported deployment file:

   ```bash
   cat deployments/296.json
   ```

   The file should include `OracleConsumer` and `SupraPriceOracleAdapter`.

9. Read the deployed Supra oracle data and demo conversions:

   ```bash
   yarn read:supra:testnet
   ```

   This read-only script loads `deployments/296.json`, reads prices through `SupraPriceOracleAdapter`, and calls the
   `OracleConsumer` demo conversion helpers. It does not broadcast transactions.

For mainnet, use the same flow with `hedera_mainnet`, `yarn deploy:supra:mainnet`, and
`yarn read:supra:mainnet`. Confirm every Supra pair in `script/HelperConfig.s.sol` passes a fresh fork smoke test
on the target network before broadcasting.

### End-To-End Pyth Flow

Use this checklist from `packages/foundry` when deploying the Pyth pull oracle template to Hedera. For a fresh clone,
run the workspace setup from the root README first.

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

5. Run the Pyth fork smoke test against real Hedera Pyth addresses and fresh Hermes update data:

   ```bash
   yarn test:pyth:testnet
   ```

6. Deploy the Pyth adapter on Hedera Testnet:

   ```bash
   yarn deploy:pyth:testnet
   ```

   The deploy command prompts for a keystore unless one is provided. To select one explicitly:

   ```bash
   yarn deploy --file DeployPythOracle.s.sol --network hedera_testnet --keystore <keystore-name>
   ```

7. Deploy the consumer with Pyth, or switch an existing consumer to Pyth:

   ```bash
   ORACLE_ADAPTER_NAME=PythPriceOracleAdapter yarn deploy:consumer:testnet
   # or, if OracleConsumer already exists:
   ORACLE_ADAPTER_NAME=PythPriceOracleAdapter yarn set-oracle:testnet
   ```

8. Check the exported deployment file:

   ```bash
   cat deployments/296.json
   ```

   The file should include `OracleConsumer` and `PythPriceOracleAdapter`.

9. Update and read the deployed Pyth oracle data and demo conversions:

   ```bash
   yarn read:pyth:testnet
   ```

   This interaction script fetches fresh Hermes update data, broadcasts Pyth update transactions, then reads prices
   through `PythPriceOracleAdapter` and calls the `OracleConsumer` demo conversion helpers.

For mainnet, use the same flow with `hedera_mainnet`, `yarn deploy:pyth:mainnet`, and `yarn read:pyth:mainnet`.
Confirm every Pyth price ID in `script/HelperConfig.s.sol` passes a fresh fork smoke test on the target network before
broadcasting.

### Extending The Template

To add a new Chainlink pair:

1. Add the feed address to `script/HelperConfig.s.sol`.
2. Add the new pair to the `FeedConfig[]` in `DeployChainlinkOracle.s.sol`.
3. Deploy a new `ChainlinkPriceOracleAdapter` with the full pair set.
4. Point `OracleConsumer` at the new adapter with `SetConsumerOracle.s.sol`, or call `setOracle(newAdapter)` from the owner.

## Setup

Forge dependencies are tracked as git submodules under `packages/foundry/lib`.
Install workspace dependencies and initialize git submodules from the repo root. After that, run package commands
from `packages/foundry`.

---

## Deploy (Foundry)

From `packages/foundry`, contract deploys use **`yarn deploy`**.

- **Hedera testnet/mainnet:** Use `yarn deploy --network hedera_testnet` (or `hedera_mainnet`). You **must** use a keystore whose address is a **Hedera-created account** (created and funded via [Hedera Portal](https://portal.hedera.com) or faucet). If you see `Requested resource not found. address '0x...'`, that address does not exist on Hedera. Create or import one with `yarn account:generate` or `yarn account:import`, then deploy with `--keystore <name>`. For multi-contract deploys, the Makefile uses `--slow` so each transaction is confirmed before the next (avoids `WRONG_NONCE` on Hedera when both txs are in flight).

- **Oracle consumer:** Deploy once after an adapter exists, then switch providers when needed:

  ```bash
  yarn deploy:consumer:testnet
  ORACLE_ADAPTER_NAME=PythPriceOracleAdapter yarn set-oracle:testnet
  ```

- **Chainlink oracle template:** Use the dedicated Makefile/Yarn shortcuts to deploy the Chainlink adapter:

  ```bash
  yarn deploy:chainlink:testnet
  yarn deploy:chainlink:mainnet
  ```

- **Supra oracle template:** Use the dedicated shortcuts to deploy the Supra adapter:

  ```bash
  yarn deploy:supra:testnet
  yarn deploy:supra:mainnet
  ```

- **Pyth oracle template:** Use the dedicated shortcuts to deploy the Pyth adapter:

  ```bash
  yarn deploy:pyth:testnet
  yarn deploy:pyth:mainnet
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
