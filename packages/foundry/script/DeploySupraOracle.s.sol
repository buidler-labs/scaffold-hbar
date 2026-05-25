// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { SupraPriceOracleAdapter } from "../contracts/oracle/adapters/SupraPriceOracleAdapter.sol";
import { OracleConsumer } from "../contracts/oracle/OracleConsumer.sol";
import { OracleRegistry } from "../contracts/oracle/OracleRegistry.sol";
import { PairLib } from "../contracts/oracle/lib/PairLib.sol";
import { ProviderLib } from "../contracts/oracle/lib/ProviderLib.sol";
import { ScaffoldHbarDeploy } from "./DeployHelpers.s.sol";
import { HelperConfig } from "./HelperConfig.s.sol";
import { console2 } from "forge-std/console2.sol";

/// @title DeploySupraOracle
/// @notice Deploys the Supra oracle template contracts and registers the default Hedera push adapters.
/// @dev Uses `HelperConfig` for network-specific Supra push oracle addresses and pair IDs.
contract DeploySupraOracle is ScaffoldHbarDeploy {
    /// @notice Maximum allowed age, in seconds, for Supra feed updates in this starter deployment.
    uint256 internal constant MAX_STALENESS = 365 days;

    /// @notice Deploys registry, Supra adapters, and the demo consumer.
    function run() external {
        HelperConfig.NetworkConfig memory config = new HelperConfig().getConfig();

        deployer = _startBroadcast();
        if (deployer == address(0)) {
            revert InvalidPrivateKey("Invalid private key");
        }

        OracleRegistry registry = _deployRegistry();

        SupraPriceOracleAdapter hbarUsdtAdapter =
            _deployAdapter(PairLib.pairKey("HBAR", "USDT"), config.supra.pushOracle, config.supra.hbarUsdtPairId);
        SupraPriceOracleAdapter btcUsdtAdapter =
            _deployAdapter(PairLib.pairKey("BTC", "USDT"), config.supra.pushOracle, config.supra.btcUsdtPairId);
        SupraPriceOracleAdapter ethUsdtAdapter =
            _deployAdapter(PairLib.pairKey("ETH", "USDT"), config.supra.pushOracle, config.supra.ethUsdtPairId);

        _registerAdapters(registry, hbarUsdtAdapter, btcUsdtAdapter, ethUsdtAdapter);

        OracleConsumer consumer = _deployConsumer(registry);

        _recordDeployments(registry, consumer, hbarUsdtAdapter, btcUsdtAdapter, ethUsdtAdapter);
        _logDeployments(registry, consumer, hbarUsdtAdapter, btcUsdtAdapter, ethUsdtAdapter);

        _stopBroadcast();
        exportDeployments();
    }

    /// @notice Deploys the owner-controlled registry.
    /// @return registry Deployed oracle registry.
    function _deployRegistry() private returns (OracleRegistry registry) {
        return new OracleRegistry(deployer);
    }

    /// @notice Deploys one Supra adapter for a pair/pair ID.
    /// @param pairKey Deterministic `BASE/QUOTE` pair key served by the adapter.
    /// @param supraOracle Supra Push Oracle address.
    /// @param supraPairId Supra pair ID served by the adapter.
    /// @return adapter Deployed Supra adapter.
    function _deployAdapter(bytes32 pairKey, address supraOracle, uint256 supraPairId)
        private
        returns (SupraPriceOracleAdapter adapter)
    {
        return new SupraPriceOracleAdapter(pairKey, supraOracle, supraPairId, MAX_STALENESS);
    }

    /// @notice Registers the default Supra adapters in the registry.
    /// @param registry Registry that stores pair/provider adapter mappings.
    /// @param hbarUsdtAdapter Supra HBAR/USDT adapter.
    /// @param btcUsdtAdapter Supra BTC/USDT adapter.
    /// @param ethUsdtAdapter Supra ETH/USDT adapter.
    function _registerAdapters(
        OracleRegistry registry,
        SupraPriceOracleAdapter hbarUsdtAdapter,
        SupraPriceOracleAdapter btcUsdtAdapter,
        SupraPriceOracleAdapter ethUsdtAdapter
    ) private {
        registry.registerOracle(PairLib.pairKey("HBAR", "USDT"), ProviderLib.SUPRA, address(hbarUsdtAdapter));
        registry.registerOracle(PairLib.pairKey("BTC", "USDT"), ProviderLib.SUPRA, address(btcUsdtAdapter));
        registry.registerOracle(PairLib.pairKey("ETH", "USDT"), ProviderLib.SUPRA, address(ethUsdtAdapter));
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
        SupraPriceOracleAdapter hbarUsdtAdapter,
        SupraPriceOracleAdapter btcUsdtAdapter,
        SupraPriceOracleAdapter ethUsdtAdapter
    ) private {
        deployments.push(Deployment({ name: "OracleRegistry", addr: address(registry) }));
        deployments.push(Deployment({ name: "OracleConsumer", addr: address(consumer) }));
        deployments.push(Deployment({ name: "SupraHbarUsdtAdapter", addr: address(hbarUsdtAdapter) }));
        deployments.push(Deployment({ name: "SupraBtcUsdtAdapter", addr: address(btcUsdtAdapter) }));
        deployments.push(Deployment({ name: "SupraEthUsdtAdapter", addr: address(ethUsdtAdapter) }));
    }

    /// @notice Logs deployment addresses for verification after a broadcast run.
    function _logDeployments(
        OracleRegistry registry,
        OracleConsumer consumer,
        SupraPriceOracleAdapter hbarUsdtAdapter,
        SupraPriceOracleAdapter btcUsdtAdapter,
        SupraPriceOracleAdapter ethUsdtAdapter
    ) private view {
        console2.log("Chain ID:", block.chainid);
        console2.log("Deployer:", deployer);
        console2.log("OracleRegistry:", address(registry));
        console2.log("OracleConsumer:", address(consumer));
        console2.log("SupraHbarUsdtAdapter:", address(hbarUsdtAdapter));
        console2.log("SupraBtcUsdtAdapter:", address(btcUsdtAdapter));
        console2.log("SupraEthUsdtAdapter:", address(ethUsdtAdapter));
    }
}
