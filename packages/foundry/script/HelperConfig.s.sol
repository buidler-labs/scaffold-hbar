// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Script } from "forge-std/Script.sol";

// ─────────────────────────────────────────────────────────────────────────────
// HelperConfig — Oracle provider configuration for Hedera deployments
//
// Addresses sourced from:
//   https://docs.chain.link/data-feeds/price-feeds/addresses?network=hedera
//   https://docs.supra.com/oracles/data-feeds/push-oracle/networks
//
// Supra pair IDs sourced from:
//   https://docs.supra.com/oracles/data-feeds/data-feeds-index
// ─────────────────────────────────────────────────────────────────────────────

abstract contract CodeConstants {
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

    uint256 internal constant SUPRA_BTC_USD_PAIR_ID = 18;
    uint256 internal constant SUPRA_ETH_USD_PAIR_ID = 19;
    uint256 internal constant SUPRA_HBAR_USD_PAIR_ID = 432;
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
        uint256 hbarUsdPairId;
        uint256 btcUsdPairId;
        uint256 ethUsdPairId;
    }

    struct NetworkConfig {
        ChainlinkConfig chainlink;
        SupraConfig supra;
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
                hbarUsdPairId: SUPRA_HBAR_USD_PAIR_ID,
                btcUsdPairId: SUPRA_BTC_USD_PAIR_ID,
                ethUsdPairId: SUPRA_ETH_USD_PAIR_ID
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
                hbarUsdPairId: SUPRA_HBAR_USD_PAIR_ID,
                btcUsdPairId: SUPRA_BTC_USD_PAIR_ID,
                ethUsdPairId: SUPRA_ETH_USD_PAIR_ID
            })
        });
    }

    function getConfig() external view returns (NetworkConfig memory) {
        return getConfigByChainId(block.chainid);
    }

    function getConfigByChainId(uint256 chainId) public view returns (NetworkConfig memory) {
        NetworkConfig memory config = networkConfigs[chainId];
        if (config.chainlink.hbarUsdFeed == address(0)) revert HelperConfig__InvalidChainId(chainId);
        return config;
    }
}
