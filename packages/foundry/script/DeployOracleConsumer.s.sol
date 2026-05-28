// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { OracleConsumer } from "../contracts/oracle/OracleConsumer.sol";
import { ScaffoldHbarDeploy } from "./DeployHelpers.s.sol";
import { console2 } from "forge-std/console2.sol";

/// @title DeployOracleConsumer
/// @notice Deploys the demo consumer once, pointing it at an already deployed oracle adapter.
/// @dev Set ORACLE_ADAPTER_ADDRESS or ORACLE_ADAPTER_NAME to choose the initial adapter.
contract DeployOracleConsumer is ScaffoldHbarDeploy {
    /// @notice Default deployment name used when ORACLE_ADAPTER_NAME is not provided.
    string internal constant DEFAULT_ORACLE_ADAPTER_NAME = "ChainlinkPriceOracleAdapter";

    /// @notice Deploys OracleConsumer with a non-zero initial adapter.
    function run() external {
        address initialOracle = _initialOracle();

        deployer = _startBroadcast();
        if (deployer == address(0)) {
            revert InvalidPrivateKey("Invalid private key");
        }

        OracleConsumer consumer = new OracleConsumer(initialOracle, deployer);

        _recordDeployment(consumer);
        _logDeployment(consumer, initialOracle);

        _stopBroadcast();
        exportDeployments();
    }

    /// @notice Resolves the initial oracle from env or deployment exports.
    /// @return initialOracle Adapter address used by the consumer constructor.
    function _initialOracle() private view returns (address initialOracle) {
        initialOracle = vm.envOr("ORACLE_ADAPTER_ADDRESS", address(0));

        if (initialOracle != address(0)) {
            return initialOracle;
        }

        string memory adapterName = vm.envOr("ORACLE_ADAPTER_NAME", DEFAULT_ORACLE_ADAPTER_NAME);

        return _deploymentAddress(_readDeployments(), adapterName);
    }

    /// @notice Records the consumer deployment for the Scaffold-HBAR deployment export.
    /// @param consumer Deployed oracle consumer.
    function _recordDeployment(OracleConsumer consumer) private {
        deployments.push(Deployment({ name: "OracleConsumer", addr: address(consumer) }));
    }

    /// @notice Logs deployment addresses for verification after a broadcast run.
    /// @param consumer Deployed oracle consumer.
    /// @param initialOracle Initial oracle adapter configured in the consumer.
    function _logDeployment(OracleConsumer consumer, address initialOracle) private view {
        console2.log("Chain ID:", block.chainid);
        console2.log("Deployer:", deployer);
        console2.log("OracleConsumer:", address(consumer));
        console2.log("Initial oracle:", initialOracle);
    }
}
