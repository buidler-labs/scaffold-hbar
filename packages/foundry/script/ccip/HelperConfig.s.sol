// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script } from "forge-std/Script.sol";

// ─────────────────────────────────────────────────────────────────────────────
// HelperConfig
//
// Central, extensible CCT configuration.  Add a new chain by inserting one
// entry in the constructor.
// ─────────────────────────────────────────────────────────────────────────────

abstract contract CodeConstants {
    uint256 internal constant HEDERA_TESTNET_CHAIN_ID = 296;
    uint64 internal constant HEDERA_TESTNET_CHAIN_SELECTOR = 222782988166878823;

    uint256 internal constant SEPOLIA_CHAIN_ID = 11155111;
    uint64 internal constant SEPOLIA_CHAIN_SELECTOR = 16015286601757825753;
}

contract HelperConfig is Script, CodeConstants {
    error HelperConfig__InvalidChainId(uint256 chainId);

    struct NetworkConfig {
        address router;
        uint64 chainSelector;
        address rmnProxy;
        address tokenAdminRegistry;
        address registryModuleOwnerCustom;
        uint64 remoteChainSelector;
    }

    mapping(uint256 chainId => NetworkConfig) public networkConfigs;

    constructor() {
        // Hedera Testnet CCIP addresses (v1.5.0).  RMN + TokenAdminRegistry
        // extracted on-chain from OnRamp.getStaticConfig(); router + modules
        // from https://docs.chain.link/ccip/directory/testnet/chain/hedera-testnet
        networkConfigs[HEDERA_TESTNET_CHAIN_ID] = NetworkConfig({
            router: 0x802C5F84eAD128Ff36fD6a3f8a418e339f467Ce4,
            chainSelector: HEDERA_TESTNET_CHAIN_SELECTOR,
            rmnProxy: 0x0Df355104424BABfb2404600A4258CfE140a78Cf,
            tokenAdminRegistry: 0xA6643e4f53ceABad16970e8592D4eF7fea49260a,
            registryModuleOwnerCustom: 0xf76cE612250eeEb8889F49FBCB11f1c2705305F6,
            remoteChainSelector: SEPOLIA_CHAIN_SELECTOR
        });

        networkConfigs[SEPOLIA_CHAIN_ID] = NetworkConfig({
            router: 0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59,
            chainSelector: SEPOLIA_CHAIN_SELECTOR,
            rmnProxy: 0xba3f6251de62dED61Ff98590cB2fDf6871FbB991,
            tokenAdminRegistry: 0x95F29FEE11c5C55d26cCcf1DB6772DE953B37B82,
            registryModuleOwnerCustom: 0x62e731218d0D47305aba2BE3751E7EE9E5520790,
            remoteChainSelector: HEDERA_TESTNET_CHAIN_SELECTOR
        });
    }

    function getConfigByChainId(uint256 chainId) public view returns (NetworkConfig memory) {
        NetworkConfig memory config = networkConfigs[chainId];
        if (config.router == address(0)) revert HelperConfig__InvalidChainId(chainId);
        return config;
    }

    function getConfig() external view returns (NetworkConfig memory) {
        return getConfigByChainId(block.chainid);
    }
}
