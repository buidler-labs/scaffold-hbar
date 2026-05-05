// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script, console2 } from "forge-std/Script.sol";
import { AddressBytes } from "@axelar-network/axelar-gmp-sdk-solidity/contracts/libs/AddressBytes.sol";
import { IInterchainTokenFactory } from "interchain-token-service/contracts/interfaces/IInterchainTokenFactory.sol";
import { ITokenManagerType } from "interchain-token-service/contracts/interfaces/ITokenManagerType.sol";
import { HelperConfig, NetworkConfig } from "./HelperConfig.s.sol";

/// @notice Links the local custom token registration to a token deployed on a remote Axelar chain.
/// @dev Call after `RegisterCustomToken` and `RegisterTokenMetadata`. The same salt used during local
///      registration must be provided so ITS derives the same token id.
contract LinkRemoteToken is Script, HelperConfig {
    using AddressBytes for address;

    /**
     * @notice Sends an Axelar ITS `linkToken` request from the current chain to `destinationChain`.
     * @param salt Factory salt used to register the local token.
     * @param destinationChain Axelar chain name, for example `hedera` or `ethereum-sepolia`.
     * @param destinationTokenAddress Token address on the destination chain, encoded as EVM address bytes.
     * @param destinationTokenManagerType Token manager type expected on the destination chain.
     * @param linkParams Extra Axelar ITS token-manager parameters; usually empty for standard flows.
     * @param gasValue Cross-chain gas amount forwarded to Axelar for the destination execution.
     * @param nativeFee Native value forwarded as `msg.value` to `linkToken`.
     */
    function run(
        bytes32 salt,
        string calldata destinationChain,
        address destinationTokenAddress,
        ITokenManagerType.TokenManagerType destinationTokenManagerType,
        bytes calldata linkParams,
        uint256 gasValue,
        uint256 nativeFee
    ) external {
        NetworkConfig memory config = getConfigByChainId(block.chainid);
        IInterchainTokenFactory factory = IInterchainTokenFactory(config.interchainTokenFactory);
        bytes memory destinationTokenBytes = destinationTokenAddress.toBytes();
        vm.startBroadcast();
        bytes32 tokenId = factory.linkToken{ value: nativeFee }(
            salt, destinationChain, destinationTokenBytes, destinationTokenManagerType, linkParams, gasValue
        );
        vm.stopBroadcast();
        console2.log("linkToken salt:");
        console2.logBytes32(salt);
        console2.log("linkToken tokenId:");
        console2.logBytes32(tokenId);
    }
}
