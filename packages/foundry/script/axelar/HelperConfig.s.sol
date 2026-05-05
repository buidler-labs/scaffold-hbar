// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script } from "forge-std/Script.sol";

// ─────────────────────────────────────────────────────────────────────────────
// HelperConfig — Axelar Bridge
//
// Central, extensible ITS config.  Add a new chain by appending to CodeConstants
// and one entry in the constructor.
//
// https://github.com/axelarnetwork/axelar-contract-deployments/blob/main/axelar-chains-config/info/testnet.json
// https://docs.axelar.dev/resources/contract-addresses/testnet/
// ─────────────────────────────────────────────────────────────────────────────

/// @notice Axelar ITS contract addresses and names for one supported chain.
/// @param axelarName String chain name expected by Axelar ITS, for example `hedera` or `ethereum-sepolia`.
/// @param chainId EVM chain id for the configured network.
/// @param interchainTokenService Axelar Interchain Token Service address on the configured network.
/// @param interchainTokenFactory Axelar Interchain Token Factory address on the configured network.
/// @param axelarGateway Axelar Gateway address on the configured network.
/// @param axelarGasService Axelar Gas Service address on the configured network.
struct NetworkConfig {
    string axelarName;
    uint64 chainId;
    address interchainTokenService;
    address interchainTokenFactory;
    address axelarGateway;
    address axelarGasService;
}

/// @notice Shared Axelar testnet constants used by the Foundry scripts.
abstract contract CodeConstants {
    /// @notice Hedera testnet EVM chain id.
    uint256 internal constant HEDERA_TESTNET_CHAIN_ID = 296;

    /// @notice Ethereum Sepolia chain id.
    uint256 internal constant SEPOLIA_CHAIN_ID = 11_155_111;

    /// @notice Axelar ITS address shared by the configured testnet deployments.
    address internal constant INTERCHAIN_TOKEN_SERVICE = 0xB5FB4BE02232B1bBA4dC8f81dc24C26980dE9e3C;

    /// @notice Axelar ITS factory address shared by the configured testnet deployments.
    address internal constant INTERCHAIN_TOKEN_FACTORY = 0x83a93500d23Fbc3e82B410aD07A6a9F7A0670D66;

    /// @notice Axelar Gateway address shared by the configured testnet deployments.
    address internal constant AXELAR_GATEWAY = 0xe432150cce91c13a887f7D836923d5597adD8E31;

    /// @notice Axelar Gas Service address shared by the configured testnet deployments.
    address internal constant AXELAR_GAS_SERVICE = 0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6;
}

/// @notice Resolves Axelar ITS configuration for supported local script targets.
contract HelperConfig is Script, CodeConstants {
    /// @notice Reverts when the current or requested chain id is not configured for Axelar ITS scripts.
    /// @param chainId Unsupported EVM chain id.
    error HelperConfig__InvalidChainId(uint256 chainId);

    /// @notice Axelar config by EVM chain id.
    mapping(uint256 chainId => NetworkConfig) public networkConfigs;

    /// @notice Seeds supported Axelar testnet network configurations.
    constructor() {
        networkConfigs[HEDERA_TESTNET_CHAIN_ID] = NetworkConfig({
            axelarName: "hedera",
            chainId: uint64(HEDERA_TESTNET_CHAIN_ID),
            interchainTokenService: INTERCHAIN_TOKEN_SERVICE,
            interchainTokenFactory: INTERCHAIN_TOKEN_FACTORY,
            axelarGateway: AXELAR_GATEWAY,
            axelarGasService: AXELAR_GAS_SERVICE
        });

        networkConfigs[SEPOLIA_CHAIN_ID] = NetworkConfig({
            axelarName: "ethereum-sepolia",
            chainId: uint64(SEPOLIA_CHAIN_ID),
            interchainTokenService: INTERCHAIN_TOKEN_SERVICE,
            interchainTokenFactory: INTERCHAIN_TOKEN_FACTORY,
            axelarGateway: AXELAR_GATEWAY,
            axelarGasService: AXELAR_GAS_SERVICE
        });
    }

    /**
     * @notice Returns Axelar ITS configuration for `chainId`.
     * @param chainId EVM chain id to resolve.
     * @return config Axelar ITS addresses and chain name for the requested chain.
     */
    function getConfigByChainId(uint256 chainId) public view returns (NetworkConfig memory) {
        NetworkConfig memory config = networkConfigs[chainId];
        if (config.interchainTokenService == address(0)) revert HelperConfig__InvalidChainId(chainId);
        return config;
    }

    /// @notice Returns Axelar ITS configuration for the currently connected RPC chain.
    function getConfig() external view returns (NetworkConfig memory) {
        return getConfigByChainId(block.chainid);
    }

    /**
     * @notice Returns Axelar ITS configuration by a human-friendly chain alias.
     * @param alias_ `sepolia` or `hedera` / `hedera_testnet` when not using `getConfig()` on the target RPC.
     * @return config Axelar ITS addresses and chain name for the requested alias.
     */
    function getConfig(string memory alias_) public view returns (NetworkConfig memory) {
        bytes32 h = keccak256(bytes(alias_));
        if (h == keccak256(bytes("sepolia"))) return getConfigByChainId(SEPOLIA_CHAIN_ID);
        if (h == keccak256(bytes("hedera")) || h == keccak256(bytes("hedera_testnet"))) {
            return getConfigByChainId(HEDERA_TESTNET_CHAIN_ID);
        }
        revert("HelperConfig: unknown chain alias (use sepolia | hedera | hedera_testnet)");
    }
}
