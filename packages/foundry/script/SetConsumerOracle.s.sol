// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { OracleConsumer } from "../contracts/oracle/OracleConsumer.sol";
import { ScaffoldHbarDeploy } from "./DeployHelpers.s.sol";
import { console2 } from "forge-std/console2.sol";

/// @title SetConsumerOracle
/// @notice Updates an existing OracleConsumer to use a selected provider adapter.
/// @dev Set ORACLE_ADAPTER_ADDRESS or ORACLE_ADAPTER_NAME to choose the new adapter.
contract SetConsumerOracle is ScaffoldHbarDeploy {
    /// @notice Default consumer deployment name used when ORACLE_CONSUMER_NAME is not provided.
    string internal constant DEFAULT_ORACLE_CONSUMER_NAME = "OracleConsumer";

    /// @notice Default adapter deployment name used when ORACLE_ADAPTER_NAME is not provided.
    string internal constant DEFAULT_ORACLE_ADAPTER_NAME = "ChainlinkPriceOracleAdapter";

    /// @notice Updates the deployed consumer's selected oracle adapter.
    function run() external {
        string memory deploymentsJson = _readDeployments();
        string memory consumerName = vm.envOr("ORACLE_CONSUMER_NAME", DEFAULT_ORACLE_CONSUMER_NAME);

        OracleConsumer consumer = OracleConsumer(_deploymentAddress(deploymentsJson, consumerName));
        address newOracle = _newOracle(deploymentsJson);
        address previousOracle = address(consumer.oracle());

        deployer = _startBroadcast();
        if (deployer == address(0)) {
            revert InvalidPrivateKey("Invalid private key");
        }

        consumer.setOracle(newOracle);

        _stopBroadcast();

        console2.log("Chain ID:", block.chainid);
        console2.log("Deployer:", deployer);
        console2.log("OracleConsumer:", address(consumer));
        console2.log("Previous oracle:", previousOracle);
        console2.log("New oracle:", newOracle);
    }

    /// @notice Resolves the new oracle from env or deployment exports.
    /// @param deploymentsJson Deployment export JSON for the current chain.
    /// @return newOracle Adapter address to set on the consumer.
    function _newOracle(string memory deploymentsJson) private view returns (address newOracle) {
        newOracle = vm.envOr("ORACLE_ADAPTER_ADDRESS", address(0));

        if (newOracle != address(0)) {
            return newOracle;
        }

        string memory adapterName = vm.envOr("ORACLE_ADAPTER_NAME", DEFAULT_ORACLE_ADAPTER_NAME);

        return _deploymentAddress(deploymentsJson, adapterName);
    }
}
