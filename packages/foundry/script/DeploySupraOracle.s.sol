// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { SupraPriceOracleAdapter } from "../contracts/oracle/adapters/SupraPriceOracleAdapter.sol";
import { PairLib } from "../contracts/oracle/lib/PairLib.sol";
import { ScaffoldHbarDeploy } from "./DeployHelpers.s.sol";
import { HelperConfig } from "./HelperConfig.s.sol";
import { console2 } from "forge-std/console2.sol";

/// @title DeploySupraOracle
/// @notice Deploys the Supra oracle adapter.
/// @dev Uses `HelperConfig` for network-specific Supra push oracle addresses and pair IDs.
contract DeploySupraOracle is ScaffoldHbarDeploy {
    /// @notice Maximum allowed age, in seconds, for Supra feed updates in this starter deployment.
    uint256 internal constant MAX_STALENESS = 365 days;

    /// @notice Deploys Supra adapter.
    function run() external {
        HelperConfig.NetworkConfig memory config = new HelperConfig().getConfig();

        deployer = _startBroadcast();
        if (deployer == address(0)) {
            revert InvalidPrivateKey("Invalid private key");
        }

        SupraPriceOracleAdapter adapter = _deployAdapter(config.supra);

        _recordDeployments(adapter);
        _logDeployments(adapter);

        _stopBroadcast();
        exportDeployments();
    }

    /// @notice Deploys one Supra adapter for the default Hedera pair IDs.
    /// @param config Supra network config.
    /// @return adapter Deployed Supra adapter.
    function _deployAdapter(HelperConfig.SupraConfig memory config) private returns (SupraPriceOracleAdapter adapter) {
        SupraPriceOracleAdapter.PairConfig[] memory pairConfigs = new SupraPriceOracleAdapter.PairConfig[](3);
        pairConfigs[0] = SupraPriceOracleAdapter.PairConfig({
            pairKey: PairLib.pairKey("HBAR", "USDT"), supraPairId: config.hbarUsdtPairId
        });
        pairConfigs[1] = SupraPriceOracleAdapter.PairConfig({
            pairKey: PairLib.pairKey("BTC", "USDT"), supraPairId: config.btcUsdtPairId
        });
        pairConfigs[2] = SupraPriceOracleAdapter.PairConfig({
            pairKey: PairLib.pairKey("ETH", "USDT"), supraPairId: config.ethUsdtPairId
        });

        return new SupraPriceOracleAdapter(config.pushOracle, pairConfigs, MAX_STALENESS);
    }

    /// @notice Records deployments for the Scaffold-HBAR deployment export.
    function _recordDeployments(SupraPriceOracleAdapter adapter) private {
        deployments.push(Deployment({ name: "SupraPriceOracleAdapter", addr: address(adapter) }));
    }

    /// @notice Logs deployment addresses for verification after a broadcast run.
    function _logDeployments(SupraPriceOracleAdapter adapter) private view {
        console2.log("Chain ID:", block.chainid);
        console2.log("Deployer:", deployer);
        console2.log("SupraPriceOracleAdapter:", address(adapter));
    }
}
