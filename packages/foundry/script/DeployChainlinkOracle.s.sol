// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { ChainlinkPriceOracleAdapter } from "../contracts/oracle/adapters/ChainlinkPriceOracleAdapter.sol";
import { OracleConsumer } from "../contracts/oracle/OracleConsumer.sol";
import { OracleRegistry } from "../contracts/oracle/OracleRegistry.sol";
import { PairLib } from "../contracts/oracle/lib/PairLib.sol";
import { ProviderLib } from "../contracts/oracle/lib/ProviderLib.sol";
import { ScaffoldHbarDeploy } from "./DeployHelpers.s.sol";
import { HelperConfig } from "./HelperConfig.s.sol";
import { console2 } from "forge-std/console2.sol";

/// @title DeployChainlinkOracle
/// @notice Deploys the Chainlink oracle template contracts and registers the default Hedera feed adapters.
/// @dev Uses `HelperConfig` for network-specific Chainlink feed addresses.
contract DeployChainlinkOracle is ScaffoldHbarDeploy {
    /// @notice Maximum allowed age, in seconds, for Chainlink feed updates in this starter deployment.
    uint256 internal constant MAX_STALENESS = 365 days;

    /// @notice Deploys registry, Chainlink adapters, and the demo consumer.
    function run() external {
        HelperConfig.NetworkConfig memory config = new HelperConfig().getConfig();

        deployer = _startBroadcast();
        if (deployer == address(0)) {
            revert InvalidPrivateKey("Invalid private key");
        }

        OracleRegistry registry = _deployRegistry();

        ChainlinkPriceOracleAdapter hbarUsdAdapter = _deployAdapter(PairLib.pairKey("HBAR", "USD"), config.hbarUsdFeed);
        ChainlinkPriceOracleAdapter btcUsdAdapter = _deployAdapter(PairLib.pairKey("BTC", "USD"), config.btcUsdFeed);
        ChainlinkPriceOracleAdapter ethUsdAdapter = _deployAdapter(PairLib.pairKey("ETH", "USD"), config.ethUsdFeed);

        _registerAdapters(registry, hbarUsdAdapter, btcUsdAdapter, ethUsdAdapter);

        OracleConsumer consumer = _deployConsumer(registry);

        _recordDeployments(registry, consumer, hbarUsdAdapter, btcUsdAdapter, ethUsdAdapter);
        _logDeployments(registry, consumer, hbarUsdAdapter, btcUsdAdapter, ethUsdAdapter);

        _stopBroadcast();
        exportDeployments();
    }

    /// @notice Deploys the owner-controlled registry.
    /// @return registry Deployed oracle registry.
    function _deployRegistry() private returns (OracleRegistry registry) {
        return new OracleRegistry(deployer);
    }

    /// @notice Deploys one Chainlink adapter for a pair/feed.
    /// @param pairKey Deterministic `BASE/QUOTE` pair key served by the adapter.
    /// @param feed Chainlink Data Feed address.
    /// @return adapter Deployed Chainlink adapter.
    function _deployAdapter(bytes32 pairKey, address feed) private returns (ChainlinkPriceOracleAdapter adapter) {
        return new ChainlinkPriceOracleAdapter(pairKey, feed, MAX_STALENESS);
    }

    /// @notice Registers the default Chainlink adapters in the registry.
    /// @param registry Registry that stores pair/provider adapter mappings.
    /// @param hbarUsdAdapter Chainlink HBAR/USD adapter.
    /// @param btcUsdAdapter Chainlink BTC/USD adapter.
    /// @param ethUsdAdapter Chainlink ETH/USD adapter.
    function _registerAdapters(
        OracleRegistry registry,
        ChainlinkPriceOracleAdapter hbarUsdAdapter,
        ChainlinkPriceOracleAdapter btcUsdAdapter,
        ChainlinkPriceOracleAdapter ethUsdAdapter
    ) private {
        registry.registerOracle(PairLib.pairKey("HBAR", "USD"), ProviderLib.CHAINLINK, address(hbarUsdAdapter));
        registry.registerOracle(PairLib.pairKey("BTC", "USD"), ProviderLib.CHAINLINK, address(btcUsdAdapter));
        registry.registerOracle(PairLib.pairKey("ETH", "USD"), ProviderLib.CHAINLINK, address(ethUsdAdapter));
    }

    /// @notice Deploys the demo consumer.
    /// @param registry Registry used by the consumer for price reads.
    /// @return consumer Deployed oracle consumer demo.
    function _deployConsumer(OracleRegistry registry) private returns (OracleConsumer consumer) {
        return new OracleConsumer(address(registry));
    }

    /// @notice Records deployments for the Scaffold-HBAR deployment export.
    function _recordDeployments(
        OracleRegistry registry,
        OracleConsumer consumer,
        ChainlinkPriceOracleAdapter hbarUsdAdapter,
        ChainlinkPriceOracleAdapter btcUsdAdapter,
        ChainlinkPriceOracleAdapter ethUsdAdapter
    ) private {
        deployments.push(Deployment({ name: "OracleRegistry", addr: address(registry) }));
        deployments.push(Deployment({ name: "OracleConsumer", addr: address(consumer) }));
        deployments.push(Deployment({ name: "ChainlinkHbarUsdAdapter", addr: address(hbarUsdAdapter) }));
        deployments.push(Deployment({ name: "ChainlinkBtcUsdAdapter", addr: address(btcUsdAdapter) }));
        deployments.push(Deployment({ name: "ChainlinkEthUsdAdapter", addr: address(ethUsdAdapter) }));
    }

    /// @notice Logs deployment addresses for verification after a broadcast run.
    function _logDeployments(
        OracleRegistry registry,
        OracleConsumer consumer,
        ChainlinkPriceOracleAdapter hbarUsdAdapter,
        ChainlinkPriceOracleAdapter btcUsdAdapter,
        ChainlinkPriceOracleAdapter ethUsdAdapter
    ) private view {
        console2.log("Chain ID:", block.chainid);
        console2.log("Deployer:", deployer);
        console2.log("OracleRegistry:", address(registry));
        console2.log("OracleConsumer:", address(consumer));
        console2.log("ChainlinkHbarUsdAdapter:", address(hbarUsdAdapter));
        console2.log("ChainlinkBtcUsdAdapter:", address(btcUsdAdapter));
        console2.log("ChainlinkEthUsdAdapter:", address(ethUsdAdapter));
    }
}
