// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Script } from "forge-std/Script.sol";

// ─────────────────────────────────────────────────────────────────────────────
// HelperConfig — Oracle provider configuration for Hedera deployments
//
// Addresses sourced from:
//   https://docs.chain.link/data-feeds/price-feeds/addresses?network=hedera
//   https://docs.supra.com/oracles/data-feeds/push-oracle/networks
//   https://docs.pyth.network/price-feeds/core/contract-addresses/evm
//
// Supra pair IDs sourced from:
//   https://docs.supra.com/oracles/data-feeds/data-feeds-index
//
// Pyth price IDs sourced from:
//   https://hermes.pyth.network/v2/price_feeds
// ─────────────────────────────────────────────────────────────────────────────

abstract contract CodeConstants {
    address internal constant ZERO_ADDRESS = address(0);

    uint256 internal constant HEDERA_MAINNET_CHAIN_ID = 295;
    uint256 internal constant HEDERA_TESTNET_CHAIN_ID = 296;

    address internal constant HEDERA_MAINNET_HBAR_USD_FEED = 0xAF685FB45C12b92b5054ccb9313e135525F9b5d5;
    address internal constant HEDERA_MAINNET_BTC_USD_FEED = 0xaD01E27668658Cc8c1Ce6Ed31503D75F31eEf480;
    address internal constant HEDERA_MAINNET_ETH_USD_FEED = 0xd2D2CB0AEb29472C3008E291355757AD6225019e;

    address internal constant HEDERA_TESTNET_HBAR_USD_FEED = 0x59bC155EB6c6C415fE43255aF66EcF0523c92B4a;
    address internal constant HEDERA_TESTNET_BTC_USD_FEED = 0x058fE79CB5775d4b167920Ca6036B824805A9ABd;
    address internal constant HEDERA_TESTNET_ETH_USD_FEED = 0xb9d461e0b962aF219866aDfA7DD19C52bB9871b9;

    address internal constant HEDERA_MAINNET_SUPRA_PUSH_ORACLE = 0xD02cc7a670047b6b012556A88e275c685d25e0c9;
    address internal constant HEDERA_TESTNET_SUPRA_PUSH_ORACLE = 0x6Cd59830AAD978446e6cc7f6cc173aF7656Fb917;

    address internal constant HEDERA_MAINNET_PYTH = 0xA2aa501b19aff244D90cc15a4Cf739D2725B5729;
    address internal constant HEDERA_TESTNET_PYTH = 0xA2aa501b19aff244D90cc15a4Cf739D2725B5729;

    uint256 internal constant SUPRA_BTC_USDT_PAIR_ID = 0;
    uint256 internal constant SUPRA_ETH_USDT_PAIR_ID = 1;
    uint256 internal constant SUPRA_HBAR_USDT_PAIR_ID = 75;

    bytes32 internal constant PYTH_HBAR_USD_PRICE_ID =
        0x3728e591097635310e6341af53db8b7ee42da9b3a8d918f9463ce9cca886dfbd;
    bytes32 internal constant PYTH_BTC_USD_PRICE_ID =
        0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43;
    bytes32 internal constant PYTH_ETH_USD_PRICE_ID =
        0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace;
}

contract HelperConfig is Script, CodeConstants {
    error HelperConfig__InvalidChainId(uint256 chainId);

    struct ChainlinkConfig {
        address hbarUsdFeed;
        address btcUsdFeed;
        address ethUsdFeed;
    }

    struct SupraConfig {
        address pushOracle;
        uint256 hbarUsdtPairId;
        uint256 btcUsdtPairId;
        uint256 ethUsdtPairId;
    }

    struct PythConfig {
        address pyth;
        bytes32 hbarUsdPriceId;
        bytes32 btcUsdPriceId;
        bytes32 ethUsdPriceId;
    }

    struct NetworkConfig {
        ChainlinkConfig chainlink;
        SupraConfig supra;
        PythConfig pyth;
    }

    mapping(uint256 chainId => NetworkConfig) public networkConfigs;

    constructor() {
        networkConfigs[HEDERA_MAINNET_CHAIN_ID] = NetworkConfig({
            chainlink: ChainlinkConfig({
                hbarUsdFeed: HEDERA_MAINNET_HBAR_USD_FEED,
                btcUsdFeed: HEDERA_MAINNET_BTC_USD_FEED,
                ethUsdFeed: HEDERA_MAINNET_ETH_USD_FEED
            }),
            supra: SupraConfig({
                pushOracle: HEDERA_MAINNET_SUPRA_PUSH_ORACLE,
                hbarUsdtPairId: SUPRA_HBAR_USDT_PAIR_ID,
                btcUsdtPairId: SUPRA_BTC_USDT_PAIR_ID,
                ethUsdtPairId: SUPRA_ETH_USDT_PAIR_ID
            }),
            pyth: PythConfig({
                pyth: HEDERA_MAINNET_PYTH,
                hbarUsdPriceId: PYTH_HBAR_USD_PRICE_ID,
                btcUsdPriceId: PYTH_BTC_USD_PRICE_ID,
                ethUsdPriceId: PYTH_ETH_USD_PRICE_ID
            })
        });

        networkConfigs[HEDERA_TESTNET_CHAIN_ID] = NetworkConfig({
            chainlink: ChainlinkConfig({
                hbarUsdFeed: HEDERA_TESTNET_HBAR_USD_FEED,
                btcUsdFeed: HEDERA_TESTNET_BTC_USD_FEED,
                ethUsdFeed: HEDERA_TESTNET_ETH_USD_FEED
            }),
            supra: SupraConfig({
                pushOracle: HEDERA_TESTNET_SUPRA_PUSH_ORACLE,
                hbarUsdtPairId: SUPRA_HBAR_USDT_PAIR_ID,
                btcUsdtPairId: SUPRA_BTC_USDT_PAIR_ID,
                ethUsdtPairId: SUPRA_ETH_USDT_PAIR_ID
            }),
            pyth: PythConfig({
                pyth: HEDERA_TESTNET_PYTH,
                hbarUsdPriceId: PYTH_HBAR_USD_PRICE_ID,
                btcUsdPriceId: PYTH_BTC_USD_PRICE_ID,
                ethUsdPriceId: PYTH_ETH_USD_PRICE_ID
            })
        });
    }

    function getConfig() external view returns (NetworkConfig memory) {
        return getConfigByChainId(block.chainid);
    }

    function getConfigByChainId(uint256 chainId) public view returns (NetworkConfig memory) {
        NetworkConfig memory config = networkConfigs[chainId];
        if (config.chainlink.hbarUsdFeed == ZERO_ADDRESS) revert HelperConfig__InvalidChainId(chainId);
        return config;
    }
}
