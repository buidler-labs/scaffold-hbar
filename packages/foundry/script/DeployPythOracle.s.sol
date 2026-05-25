// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { PythPriceOracleAdapter } from "../contracts/oracle/adapters/PythPriceOracleAdapter.sol";
import { OracleConsumer } from "../contracts/oracle/OracleConsumer.sol";
import { OracleRegistry } from "../contracts/oracle/OracleRegistry.sol";
import { PairLib } from "../contracts/oracle/lib/PairLib.sol";
import { ProviderLib } from "../contracts/oracle/lib/ProviderLib.sol";
import { ScaffoldHbarDeploy } from "./DeployHelpers.s.sol";
import { HelperConfig } from "./HelperConfig.s.sol";
import { IPyth } from "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import { console2 } from "forge-std/console2.sol";

/// @title DeployPythOracle
/// @notice Deploys the Pyth oracle template contracts and registers the default Hedera pull-oracle adapters.
/// @dev Uses `HelperConfig` for network-specific Pyth contract addresses and price IDs.
contract DeployPythOracle is ScaffoldHbarDeploy {
    /// @notice Maximum allowed age, in seconds, for Pyth prices in this starter deployment.
    uint256 internal constant MAX_STALENESS = 1 hours;

    /// @notice Command length used to fetch one Pyth update payload through `ffi`.
    uint256 internal constant FETCH_PYTH_UPDATE_DATA_COMMAND_LENGTH = 3;

    /// @notice Minimum non-zero native value accepted by Hedera JSON-RPC, equal to one tinybar.
    uint256 internal constant HEDERA_MIN_NON_ZERO_VALUE = 10_000_000_000;

    /// @notice Deploys registry, Pyth adapters, and the demo consumer.
    function run() external {
        HelperConfig.NetworkConfig memory config = new HelperConfig().getConfig();

        deployer = _startBroadcast();
        if (deployer == address(0)) {
            revert InvalidPrivateKey("Invalid private key");
        }

        OracleRegistry registry = _deployRegistry();

        PythPriceOracleAdapter hbarUsdAdapter =
            _deployAdapter(PairLib.pairKey("HBAR", "USD"), config.pyth.pyth, config.pyth.hbarUsdPriceId);
        PythPriceOracleAdapter btcUsdAdapter =
            _deployAdapter(PairLib.pairKey("BTC", "USD"), config.pyth.pyth, config.pyth.btcUsdPriceId);
        PythPriceOracleAdapter ethUsdAdapter =
            _deployAdapter(PairLib.pairKey("ETH", "USD"), config.pyth.pyth, config.pyth.ethUsdPriceId);

        _updatePythPrice(config.pyth.pyth, config.pyth.hbarUsdPriceId, hbarUsdAdapter);
        _updatePythPrice(config.pyth.pyth, config.pyth.btcUsdPriceId, btcUsdAdapter);
        _updatePythPrice(config.pyth.pyth, config.pyth.ethUsdPriceId, ethUsdAdapter);
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

    /// @notice Deploys one Pyth adapter for a pair/price ID.
    /// @param pairKey Deterministic `BASE/QUOTE` pair key served by the adapter.
    /// @param pyth Pyth EVM contract address.
    /// @param priceId Pyth price feed ID served by the adapter.
    /// @return adapter Deployed Pyth adapter.
    function _deployAdapter(bytes32 pairKey, address pyth, bytes32 priceId)
        private
        returns (PythPriceOracleAdapter adapter)
    {
        return new PythPriceOracleAdapter(pairKey, pyth, priceId, MAX_STALENESS);
    }

    /// @notice Updates one Pyth price feed before registry validation reads its adapter.
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

    /// @notice Registers the default Pyth adapters in the registry.
    /// @param registry Registry that stores pair/provider adapter mappings.
    /// @param hbarUsdAdapter Pyth HBAR/USD adapter.
    /// @param btcUsdAdapter Pyth BTC/USD adapter.
    /// @param ethUsdAdapter Pyth ETH/USD adapter.
    function _registerAdapters(
        OracleRegistry registry,
        PythPriceOracleAdapter hbarUsdAdapter,
        PythPriceOracleAdapter btcUsdAdapter,
        PythPriceOracleAdapter ethUsdAdapter
    ) private {
        registry.registerOracle(PairLib.pairKey("HBAR", "USD"), ProviderLib.PYTH, address(hbarUsdAdapter));
        registry.registerOracle(PairLib.pairKey("BTC", "USD"), ProviderLib.PYTH, address(btcUsdAdapter));
        registry.registerOracle(PairLib.pairKey("ETH", "USD"), ProviderLib.PYTH, address(ethUsdAdapter));
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
        PythPriceOracleAdapter hbarUsdAdapter,
        PythPriceOracleAdapter btcUsdAdapter,
        PythPriceOracleAdapter ethUsdAdapter
    ) private {
        deployments.push(Deployment({ name: "OracleRegistry", addr: address(registry) }));
        deployments.push(Deployment({ name: "OracleConsumer", addr: address(consumer) }));
        deployments.push(Deployment({ name: "PythHbarUsdAdapter", addr: address(hbarUsdAdapter) }));
        deployments.push(Deployment({ name: "PythBtcUsdAdapter", addr: address(btcUsdAdapter) }));
        deployments.push(Deployment({ name: "PythEthUsdAdapter", addr: address(ethUsdAdapter) }));
    }

    /// @notice Logs deployment addresses for verification after a broadcast run.
    function _logDeployments(
        OracleRegistry registry,
        OracleConsumer consumer,
        PythPriceOracleAdapter hbarUsdAdapter,
        PythPriceOracleAdapter btcUsdAdapter,
        PythPriceOracleAdapter ethUsdAdapter
    ) private view {
        console2.log("Chain ID:", block.chainid);
        console2.log("Deployer:", deployer);
        console2.log("OracleRegistry:", address(registry));
        console2.log("OracleConsumer:", address(consumer));
        console2.log("PythHbarUsdAdapter:", address(hbarUsdAdapter));
        console2.log("PythBtcUsdAdapter:", address(btcUsdAdapter));
        console2.log("PythEthUsdAdapter:", address(ethUsdAdapter));
    }
}
