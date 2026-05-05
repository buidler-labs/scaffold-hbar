// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { Script } from "forge-std/Script.sol";

// ─────────────────────────────────────────────────────────────────────────────
// HelperConfig — LayerZero V2 chain configuration
//
// Addresses sourced from:
//   https://metadata.layerzero-api.com/v1/metadata/deployments
// DVN addresses are the "LayerZero Labs" testnet entries for each chain.
// ─────────────────────────────────────────────────────────────────────────────

abstract contract CodeConstants {
    // ── Hedera Testnet ───────────────────────────────────────────────────────
    uint256 internal constant HEDERA_TESTNET_CHAIN_ID = 296;
    uint32 internal constant HEDERA_TESTNET_EID = 40285;

    address internal constant HEDERA_ENDPOINT_V2 = 0xbD672D1562Dd32C23B563C989d8140122483631d;
    address internal constant HEDERA_SEND_ULN302 = 0x1707575F7cEcdC0Ad53fde9ba9bda3Ed5d4440f4;
    address internal constant HEDERA_RECEIVE_ULN302 = 0xc0c34919A04d69415EF2637A3Db5D637a7126cd0;
    address internal constant HEDERA_EXECUTOR = 0xe514D331c54d7339108045bF4794F8d71cad110e;
    address internal constant HEDERA_DVN_LZ_LABS = 0xEc7Ee1f9e9060e08dF969Dc08EE72674AfD5E14D;

    // ── Sepolia Testnet ──────────────────────────────────────────────────────
    uint256 internal constant SEPOLIA_CHAIN_ID = 11155111;
    uint32 internal constant SEPOLIA_EID = 40161;

    address internal constant SEPOLIA_ENDPOINT_V2 = 0x6EDCE65403992e310A62460808c4b910D972f10f;
    address internal constant SEPOLIA_SEND_ULN302 = 0xcc1ae8Cf5D3904Cef3360A9532B477529b177cCE;
    address internal constant SEPOLIA_RECEIVE_ULN302 = 0xdAf00F5eE2158dD58E0d3857851c432E34A3A851;
    address internal constant SEPOLIA_EXECUTOR = 0x718B92b5CB0a5552039B593faF724D182A881eDA;
    address internal constant SEPOLIA_DVN_LZ_LABS = 0x8eebf8b423B73bFCa51a1Db4B7354AA0bFCA9193;
}

contract HelperConfig is Script, CodeConstants {
    error HelperConfig__InvalidChainId(uint256 chainId);

    struct NetworkConfig {
        address endpointV2;
        uint32 eid;
        address sendUln302;
        address receiveUln302;
        address executor;
        address dvn;
        uint32 remoteEid;
    }

    mapping(uint256 => NetworkConfig) public networkConfigs;

    constructor() {
        networkConfigs[HEDERA_TESTNET_CHAIN_ID] = NetworkConfig({
            endpointV2: HEDERA_ENDPOINT_V2,
            eid: HEDERA_TESTNET_EID,
            sendUln302: HEDERA_SEND_ULN302,
            receiveUln302: HEDERA_RECEIVE_ULN302,
            executor: HEDERA_EXECUTOR,
            dvn: HEDERA_DVN_LZ_LABS,
            remoteEid: SEPOLIA_EID
        });

        networkConfigs[SEPOLIA_CHAIN_ID] = NetworkConfig({
            endpointV2: SEPOLIA_ENDPOINT_V2,
            eid: SEPOLIA_EID,
            sendUln302: SEPOLIA_SEND_ULN302,
            receiveUln302: SEPOLIA_RECEIVE_ULN302,
            executor: SEPOLIA_EXECUTOR,
            dvn: SEPOLIA_DVN_LZ_LABS,
            remoteEid: HEDERA_TESTNET_EID
        });
    }

    function getConfig() external view returns (NetworkConfig memory) {
        return getConfigByChainId(block.chainid);
    }

    function getConfigByChainId(uint256 chainId) public view returns (NetworkConfig memory) {
        NetworkConfig memory config = networkConfigs[chainId];
        if (config.endpointV2 == address(0)) revert HelperConfig__InvalidChainId(chainId);
        return config;
    }
}
