// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { PythPriceOracleAdapter } from "../contracts/oracle/adapters/PythPriceOracleAdapter.sol";
import { PairLib } from "../contracts/oracle/lib/PairLib.sol";
import { ScaffoldHbarDeploy } from "./DeployHelpers.s.sol";
import { HelperConfig } from "./HelperConfig.s.sol";
import { IPyth } from "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import { console2 } from "forge-std/console2.sol";

/// @title DeployPythOracle
/// @notice Deploys the Pyth oracle adapter.
/// @dev Uses `HelperConfig` for network-specific Pyth contract addresses and price IDs.
contract DeployPythOracle is ScaffoldHbarDeploy {
    /// @notice Maximum allowed age, in seconds, for Pyth prices in this starter deployment.
    uint256 internal constant MAX_STALENESS = 1 hours;

    /// @notice Command length used to fetch one Pyth update payload through `ffi`.
    uint256 internal constant FETCH_PYTH_UPDATE_DATA_COMMAND_LENGTH = 3;

    /// @notice Minimum non-zero native value accepted by Hedera JSON-RPC, equal to one tinybar.
    uint256 internal constant HEDERA_MIN_NON_ZERO_VALUE = 10_000_000_000;

    /// @notice Deploys Pyth adapter.
    function run() external {
        HelperConfig.NetworkConfig memory config = new HelperConfig().getConfig();

        deployer = _startBroadcast();
        if (deployer == address(0)) {
            revert InvalidPrivateKey("Invalid private key");
        }

        PythPriceOracleAdapter adapter = _deployAdapter(config.pyth);

        _updatePythPrice(config.pyth.pyth, config.pyth.hbarUsdPriceId, adapter);
        _updatePythPrice(config.pyth.pyth, config.pyth.btcUsdPriceId, adapter);
        _updatePythPrice(config.pyth.pyth, config.pyth.ethUsdPriceId, adapter);

        _recordDeployments(adapter);
        _logDeployments(adapter);

        _stopBroadcast();
        exportDeployments();
    }

    /// @notice Deploys one Pyth adapter for the default Hedera price IDs.
    /// @param config Pyth network config.
    /// @return adapter Deployed Pyth adapter.
    function _deployAdapter(HelperConfig.PythConfig memory config) private returns (PythPriceOracleAdapter adapter) {
        PythPriceOracleAdapter.PriceConfig[] memory priceConfigs = new PythPriceOracleAdapter.PriceConfig[](3);
        priceConfigs[0] = PythPriceOracleAdapter.PriceConfig({
            pairKey: PairLib.pairKey("HBAR", "USD"), priceId: config.hbarUsdPriceId
        });
        priceConfigs[1] = PythPriceOracleAdapter.PriceConfig({
            pairKey: PairLib.pairKey("BTC", "USD"), priceId: config.btcUsdPriceId
        });
        priceConfigs[2] = PythPriceOracleAdapter.PriceConfig({
            pairKey: PairLib.pairKey("ETH", "USD"), priceId: config.ethUsdPriceId
        });

        return new PythPriceOracleAdapter(config.pyth, priceConfigs, MAX_STALENESS);
    }

    /// @notice Updates one Pyth price feed before the deployment exports the adapter.
    /// @param pyth Pyth EVM contract address.
    /// @param priceId Pyth price feed ID to update.
    /// @param adapter Adapter used to forward the update data to the Pyth contract.
    function _updatePythPrice(address pyth, bytes32 priceId, PythPriceOracleAdapter adapter) private {
        bytes[] memory updateData = _fetchPythUpdateData(priceId);
        uint256 updateFee = IPyth(pyth).getUpdateFee(updateData);

        adapter.updatePrice{ value: _nativeValueForPythUpdate(updateFee) }(updateData);
    }

    /// @notice Rounds small non-zero Pyth fees up to Hedera's minimum native transfer amount.
    /// @param updateFee Native token amount required by Pyth.
    /// @return nativeValue Native token amount to send with the Pyth update transaction.
    function _nativeValueForPythUpdate(uint256 updateFee) private pure returns (uint256 nativeValue) {
        if (updateFee == 0 || updateFee >= HEDERA_MIN_NON_ZERO_VALUE) {
            return updateFee;
        }

        return HEDERA_MIN_NON_ZERO_VALUE;
    }

    /// @notice Fetches fresh Hermes update data for one Pyth price ID.
    /// @param priceId Pyth price feed ID.
    /// @return updateData Pyth update payloads encoded as `bytes[]`.
    function _fetchPythUpdateData(bytes32 priceId) private returns (bytes[] memory updateData) {
        string[] memory inputs = new string[](FETCH_PYTH_UPDATE_DATA_COMMAND_LENGTH);
        inputs[0] = "node";
        inputs[1] = "scripts-js/fetchPythUpdateData.js";
        inputs[2] = vm.toString(priceId);

        return abi.decode(vm.ffi(inputs), (bytes[]));
    }

    /// @notice Records deployments for the Scaffold-HBAR deployment export.
    function _recordDeployments(PythPriceOracleAdapter adapter) private {
        deployments.push(Deployment({ name: "PythPriceOracleAdapter", addr: address(adapter) }));
    }

    /// @notice Logs deployment addresses for verification after a broadcast run.
    function _logDeployments(PythPriceOracleAdapter adapter) private view {
        console2.log("Chain ID:", block.chainid);
        console2.log("Deployer:", deployer);
        console2.log("PythPriceOracleAdapter:", address(adapter));
    }
}
