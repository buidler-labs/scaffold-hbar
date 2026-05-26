# Foundry package (Hedera)

Solidity framework for building, developing, testing, and deploying smart contracts on Hedera.

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

### HelperConfig

`script/HelperConfig.s.sol` stores network-specific provider addresses, feed addresses, Supra pair IDs, and Pyth
price IDs used by deploy, read, and fork-test scripts.

Update `HelperConfig` when adding a network, provider feed, or supported pair. Unsupported chain IDs revert from
`getConfigByChainId`.

### Prerequisites

Before using this package, it helps to understand:

- Hedera EVM account requirements: live testnet/mainnet deploys need a Hedera-created, funded account.
- Foundry basics: `forge script`, keystores, fork tests, and `foundry.toml` RPC endpoints.
- Oracle models: Chainlink and Supra are push-style reads, while Pyth is a pull oracle that needs fresh update data.
- Provider docs for the oracle you plan to deploy, especially supported networks, pair symbols, feed IDs, and price IDs.

For a fresh clone, install workspace dependencies and initialize Forge submodules from the repo root first. Then run
package commands from `packages/foundry`.

Run these steps once before using any provider flow:

1. Create or import a Foundry keystore account:

   ```bash
   yarn account:generate
   # or
   yarn account:import
   ```

2. Fund that Hedera account with testnet HBAR from the [Hedera Portal faucet](https://portal.hedera.com/faucet).

3. Compile contracts and run deterministic unit tests:

   ```bash
   yarn compile
   yarn test
   ```

### End-To-End Chainlink Flow

Use this checklist from `packages/foundry` when deploying the Chainlink oracle template to Hedera.

1. Run the Chainlink fork smoke test against real Hedera Testnet feed addresses:

   ```bash
   yarn test:chainlink:testnet
   ```

2. Deploy the Chainlink adapter on Hedera Testnet:

   ```bash
   yarn deploy:chainlink:testnet
   ```

   The deploy command prompts for a keystore unless one is provided. To select one explicitly:

   ```bash
   yarn deploy --file DeployChainlinkOracle.s.sol --network hedera_testnet --keystore <keystore-name>
   ```

3. Deploy the consumer once, pointing at the Chainlink adapter:

   ```bash
   ORACLE_ADAPTER_NAME=ChainlinkPriceOracleAdapter yarn deploy:consumer:testnet
   ```

4. Check the exported deployment file:

   ```bash
   cat deployments/296.json
   ```

   The file should include `OracleConsumer` and `ChainlinkPriceOracleAdapter`.

5. Read the deployed Chainlink oracle data and demo conversions:

   ```bash
   yarn read:chainlink:testnet
   ```

   This read-only script loads `deployments/296.json`, reads prices through `ChainlinkPriceOracleAdapter`, and calls the
   `OracleConsumer` demo conversion helpers. It does not broadcast transactions.

6. Verify contracts with Sourcify when needed:

   ```bash
   yarn verify:testnet 0xContractAddress contracts/oracle/adapters/ChainlinkPriceOracleAdapter.sol:ChainlinkPriceOracleAdapter
   ```

For mainnet, use `hedera_mainnet`, `yarn deploy:chainlink:mainnet`, `yarn read:chainlink:mainnet`, and:

```bash
yarn verify:mainnet 0xContractAddress contracts/oracle/adapters/ChainlinkPriceOracleAdapter.sol:ChainlinkPriceOracleAdapter
```

Use a funded mainnet Hedera account and confirm every feed address in `script/HelperConfig.s.sol` before broadcasting.
After Sourcify accepts the match, HashScan displays the verified status.

### End-To-End Supra Flow

Use this checklist from `packages/foundry` when deploying the Supra push oracle template to Hedera.

1. Run the Supra fork smoke test against real Hedera Testnet push oracle data:

   ```bash
   yarn test:supra:testnet
   ```

2. Deploy the Supra adapter on Hedera Testnet:

   ```bash
   yarn deploy:supra:testnet
   ```

   The deploy command prompts for a keystore unless one is provided. To select one explicitly:

   ```bash
   yarn deploy --file DeploySupraOracle.s.sol --network hedera_testnet --keystore <keystore-name>
   ```

3. Deploy the consumer with Supra, or switch an existing consumer to Supra:

   ```bash
   ORACLE_ADAPTER_NAME=SupraPriceOracleAdapter yarn deploy:consumer:testnet
   # or, if OracleConsumer already exists:
   ORACLE_ADAPTER_NAME=SupraPriceOracleAdapter yarn set-oracle:testnet
   ```

4. Check the exported deployment file:

   ```bash
   cat deployments/296.json
   ```

   The file should include `OracleConsumer` and `SupraPriceOracleAdapter`.

5. Read the deployed Supra oracle data and demo conversions:

   ```bash
   yarn read:supra:testnet
   ```

   This read-only script loads `deployments/296.json`, reads prices through `SupraPriceOracleAdapter`, and calls the
   `OracleConsumer` demo conversion helpers. It does not broadcast transactions.

6. Verify contracts with Sourcify when needed:

   ```bash
   yarn verify:testnet 0xContractAddress contracts/oracle/adapters/SupraPriceOracleAdapter.sol:SupraPriceOracleAdapter
   ```

For mainnet, use `hedera_mainnet`, `yarn deploy:supra:mainnet`, `yarn read:supra:mainnet`, and:

```bash
yarn verify:mainnet 0xContractAddress contracts/oracle/adapters/SupraPriceOracleAdapter.sol:SupraPriceOracleAdapter
```

Confirm every Supra pair in `script/HelperConfig.s.sol` passes a fresh fork smoke test on the target network before
broadcasting.

### End-To-End Pyth Flow

Use this checklist from `packages/foundry` when deploying the Pyth pull oracle template to Hedera.

1. Run the Pyth fork smoke test against real Hedera Pyth addresses and fresh Hermes update data:

   ```bash
   yarn test:pyth:testnet
   ```

2. Deploy the Pyth adapter on Hedera Testnet:

   ```bash
   yarn deploy:pyth:testnet
   ```

   The deploy command prompts for a keystore unless one is provided. To select one explicitly:

   ```bash
   yarn deploy --file DeployPythOracle.s.sol --network hedera_testnet --keystore <keystore-name>
   ```

3. Deploy the consumer with Pyth, or switch an existing consumer to Pyth:

   ```bash
   ORACLE_ADAPTER_NAME=PythPriceOracleAdapter yarn deploy:consumer:testnet
   # or, if OracleConsumer already exists:
   ORACLE_ADAPTER_NAME=PythPriceOracleAdapter yarn set-oracle:testnet
   ```

4. Check the exported deployment file:

   ```bash
   cat deployments/296.json
   ```

   The file should include `OracleConsumer` and `PythPriceOracleAdapter`.

5. Update and read the deployed Pyth oracle data and demo conversions:

   ```bash
   yarn read:pyth:testnet
   ```

   This interaction script fetches fresh Hermes update data, broadcasts Pyth update transactions, then reads prices
   through `PythPriceOracleAdapter` and calls the `OracleConsumer` demo conversion helpers.

6. Verify contracts with Sourcify when needed:

   ```bash
   yarn verify:testnet 0xContractAddress contracts/oracle/adapters/PythPriceOracleAdapter.sol:PythPriceOracleAdapter
   ```

For mainnet, use `hedera_mainnet`, `yarn deploy:pyth:mainnet`, `yarn read:pyth:mainnet`, and:

```bash
yarn verify:mainnet 0xContractAddress contracts/oracle/adapters/PythPriceOracleAdapter.sol:PythPriceOracleAdapter
```

Confirm every Pyth price ID in `script/HelperConfig.s.sol` passes a fresh fork smoke test on the target network before
broadcasting.

### Extending The Template

To add a new Chainlink pair:

1. Add the feed address to `script/HelperConfig.s.sol`.
2. Add the new pair to the `FeedConfig[]` in `DeployChainlinkOracle.s.sol`.
3. Deploy a new `ChainlinkPriceOracleAdapter` with the full pair set.
4. Point `OracleConsumer` at the new adapter with `SetConsumerOracle.s.sol`, or call `setOracle(newAdapter)` from the owner.

## Notes And Limitations

- Supra uses the push oracle model only.
- Supra pairs are configured as `USDT` pairs because `USD` pairs are not supported in the current Hedera Supra setup.
- Pyth uses a pull oracle model. Callers and scripts must provide fresh Pyth update data and pay the update fee before
  reading fresh prices.
- Pyth deploy and read scripts fetch fresh Hermes update data and broadcast update transactions where needed.

## Resources

- [Hedera smart contract docs](https://docs.hedera.com/hedera/core-concepts/smart-contracts/deploying-smart-contracts)
- [Chainlink Data Feeds docs](https://docs.chain.link/data-feeds)
- [Supra Oracle docs](https://docs.supra.com/oracles)
- [Supra push oracle networks](https://docs.supra.com/oracles/data-feeds/push-oracle/networks)
- [Pyth Price Feeds docs](https://docs.pyth.network/price-feeds/price-feeds)
- [Pyth EVM API reference](https://api-reference.pyth.network/price-feeds/evm)
- [Pyth update-price explanation](https://docs.pyth.network/price-feeds/core/why-update-prices)
