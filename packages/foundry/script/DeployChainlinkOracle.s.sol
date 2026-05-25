// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { ChainlinkPriceOracleAdapter } from "../contracts/oracle/adapters/ChainlinkPriceOracleAdapter.sol";
import { PairLib } from "../contracts/oracle/lib/PairLib.sol";
import { ScaffoldHbarDeploy } from "./DeployHelpers.s.sol";
import { HelperConfig } from "./HelperConfig.s.sol";
import { console2 } from "forge-std/console2.sol";

/// @title DeployChainlinkOracle
/// @notice Deploys the Chainlink oracle template adapter.
/// @dev Uses `HelperConfig` for network-specific Chainlink feed addresses.
contract DeployChainlinkOracle is ScaffoldHbarDeploy {
    /// @notice Maximum allowed age, in seconds, for Chainlink feed updates in this starter deployment.
    uint256 internal constant MAX_STALENESS = 365 days;

    /// @notice Deploys Chainlink adapter.
    function run() external {
        HelperConfig.NetworkConfig memory config = new HelperConfig().getConfig();

        deployer = _startBroadcast();
        if (deployer == address(0)) {
            revert InvalidPrivateKey("Invalid private key");
        }

        ChainlinkPriceOracleAdapter adapter = _deployAdapter(config.chainlink);

        _recordDeployments(adapter);
        _logDeployments(adapter);

        _stopBroadcast();
        exportDeployments();
    }

    /// @notice Deploys one Chainlink adapter for the default Hedera feeds.
    /// @param config Chainlink network config.
    /// @return adapter Deployed Chainlink adapter.
    function _deployAdapter(HelperConfig.ChainlinkConfig memory config)
        private
        returns (ChainlinkPriceOracleAdapter adapter)
    {
        ChainlinkPriceOracleAdapter.FeedConfig[] memory feedConfigs = new ChainlinkPriceOracleAdapter.FeedConfig[](3);
        feedConfigs[0] = ChainlinkPriceOracleAdapter.FeedConfig({
            pairKey: PairLib.pairKey("HBAR", "USD"), feed: config.hbarUsdFeed
        });
        feedConfigs[1] =
            ChainlinkPriceOracleAdapter.FeedConfig({ pairKey: PairLib.pairKey("BTC", "USD"), feed: config.btcUsdFeed });
        feedConfigs[2] =
            ChainlinkPriceOracleAdapter.FeedConfig({ pairKey: PairLib.pairKey("ETH", "USD"), feed: config.ethUsdFeed });

        return new ChainlinkPriceOracleAdapter(feedConfigs, MAX_STALENESS);
    }

    /// @notice Records deployments for the Scaffold-HBAR deployment export.
    function _recordDeployments(ChainlinkPriceOracleAdapter adapter) private {
        deployments.push(Deployment({ name: "ChainlinkPriceOracleAdapter", addr: address(adapter) }));
    }

    /// @notice Logs deployment addresses for verification after a broadcast run.
    function _logDeployments(ChainlinkPriceOracleAdapter adapter) private view {
        console2.log("Chain ID:", block.chainid);
        console2.log("Deployer:", deployer);
        console2.log("ChainlinkPriceOracleAdapter:", address(adapter));
    }
}
