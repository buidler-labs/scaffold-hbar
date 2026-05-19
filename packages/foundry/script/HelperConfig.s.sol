// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Script } from "forge-std/Script.sol";

// ─────────────────────────────────────────────────────────────────────────────
// HelperConfig — Chainlink Data Feed configuration for Hedera deployments
//
// Addresses sourced from:
//   https://docs.chain.link/data-feeds/price-feeds/addresses?network=hedera
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
}

contract HelperConfig is Script, CodeConstants {
    error HelperConfig__InvalidChainId(uint256 chainId);

    struct NetworkConfig {
        address hbarUsdFeed;
        address btcUsdFeed;
        address ethUsdFeed;
    }

    mapping(uint256 chainId => NetworkConfig) public networkConfigs;

    constructor() {
        networkConfigs[HEDERA_MAINNET_CHAIN_ID] = NetworkConfig({
            hbarUsdFeed: HEDERA_MAINNET_HBAR_USD_FEED,
            btcUsdFeed: HEDERA_MAINNET_BTC_USD_FEED,
            ethUsdFeed: HEDERA_MAINNET_ETH_USD_FEED
        });

        networkConfigs[HEDERA_TESTNET_CHAIN_ID] = NetworkConfig({
            hbarUsdFeed: HEDERA_TESTNET_HBAR_USD_FEED,
            btcUsdFeed: HEDERA_TESTNET_BTC_USD_FEED,
            ethUsdFeed: HEDERA_TESTNET_ETH_USD_FEED
        });
    }

    function getConfig() external view returns (NetworkConfig memory) {
        return getConfigByChainId(block.chainid);
    }

    function getConfigByChainId(uint256 chainId) public view returns (NetworkConfig memory) {
        NetworkConfig memory config = networkConfigs[chainId];
        if (config.hbarUsdFeed == address(0)) revert HelperConfig__InvalidChainId(chainId);
        return config;
    }
}
