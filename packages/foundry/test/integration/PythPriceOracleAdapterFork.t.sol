// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Test } from "forge-std/Test.sol";
import { IPyth } from "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import { IPriceOracle } from "../../contracts/oracle/interfaces/IPriceOracle.sol";
import { OracleRegistry } from "../../contracts/oracle/OracleRegistry.sol";
import { PythPriceOracleAdapter } from "../../contracts/oracle/adapters/PythPriceOracleAdapter.sol";
import { PairLib } from "../../contracts/oracle/lib/PairLib.sol";
import { ProviderLib } from "../../contracts/oracle/lib/ProviderLib.sol";
import { HelperConfig } from "../../script/HelperConfig.s.sol";

contract PythPriceOracleAdapterForkTest is Test {
    uint256 private constant MAX_STALENESS = 1 hours;
    uint256 private constant TEST_NATIVE_BALANCE = 1 ether;
    uint256 private constant FETCH_PYTH_UPDATE_DATA_COMMAND_LENGTH = 3;

    HelperConfig private helperConfig;
    HelperConfig.NetworkConfig private config;
    OracleRegistry private registry;

    function setUp() public {
        helperConfig = new HelperConfig();
        config = helperConfig.getConfig();
        registry = new OracleRegistry(address(this));

        vm.deal(address(this), TEST_NATIVE_BALANCE);
    }

    function test_Fork_UpdateAndLatestPriceReadsHbarUsdFeed() public {
        bytes32 pairKey = PairLib.pairKey("HBAR", "USD");
        PythPriceOracleAdapter adapter =
            new PythPriceOracleAdapter(pairKey, config.pyth.pyth, config.pyth.hbarUsdPriceId, MAX_STALENESS);

        bytes[] memory updateData = _fetchPythUpdateData(config.pyth.hbarUsdPriceId);
        uint256 updateFee = IPyth(config.pyth.pyth).getUpdateFee(updateData);

        adapter.updatePrice{ value: updateFee }(updateData);

        IPriceOracle.PriceData memory data = adapter.latestPrice();

        assertEq(data.pairKey, pairKey, "Adapter should report the configured HBAR/USD pair key");
        assertEq(data.providerKey, ProviderLib.PYTH, "Adapter should report the Pyth provider key");
        assertGt(data.priceE18, 0, "Adapter should return a non-zero HBAR/USD price");
        assertGt(data.updatedAt, 0, "Adapter should return a non-zero HBAR/USD updatedAt timestamp");
    }

    function test_Fork_UpdateAndLatestPriceReadsBtcUsdFeed() public {
        bytes32 pairKey = PairLib.pairKey("BTC", "USD");
        PythPriceOracleAdapter adapter =
            new PythPriceOracleAdapter(pairKey, config.pyth.pyth, config.pyth.btcUsdPriceId, MAX_STALENESS);

        bytes[] memory updateData = _fetchPythUpdateData(config.pyth.btcUsdPriceId);
        uint256 updateFee = IPyth(config.pyth.pyth).getUpdateFee(updateData);

        adapter.updatePrice{ value: updateFee }(updateData);

        IPriceOracle.PriceData memory data = adapter.latestPrice();

        assertEq(data.pairKey, pairKey, "Adapter should report the configured BTC/USD pair key");
        assertEq(data.providerKey, ProviderLib.PYTH, "Adapter should report the Pyth provider key");
        assertGt(data.priceE18, 0, "Adapter should return a non-zero BTC/USD price");
        assertGt(data.updatedAt, 0, "Adapter should return a non-zero BTC/USD updatedAt timestamp");
    }

    function test_Fork_UpdateAndLatestPriceReadsEthUsdFeed() public {
        bytes32 pairKey = PairLib.pairKey("ETH", "USD");
        PythPriceOracleAdapter adapter =
            new PythPriceOracleAdapter(pairKey, config.pyth.pyth, config.pyth.ethUsdPriceId, MAX_STALENESS);

        bytes[] memory updateData = _fetchPythUpdateData(config.pyth.ethUsdPriceId);
        uint256 updateFee = IPyth(config.pyth.pyth).getUpdateFee(updateData);

        adapter.updatePrice{ value: updateFee }(updateData);

        IPriceOracle.PriceData memory data = adapter.latestPrice();

        assertEq(data.pairKey, pairKey, "Adapter should report the configured ETH/USD pair key");
        assertEq(data.providerKey, ProviderLib.PYTH, "Adapter should report the Pyth provider key");
        assertGt(data.priceE18, 0, "Adapter should return a non-zero ETH/USD price");
        assertGt(data.updatedAt, 0, "Adapter should return a non-zero ETH/USD updatedAt timestamp");
    }

    function test_Fork_RegistryPassesThroughPythPriceAfterUpdate() public {
        bytes32 pairKey = PairLib.pairKey("HBAR", "USD");
        PythPriceOracleAdapter adapter =
            new PythPriceOracleAdapter(pairKey, config.pyth.pyth, config.pyth.hbarUsdPriceId, MAX_STALENESS);

        bytes[] memory updateData = _fetchPythUpdateData(config.pyth.hbarUsdPriceId);
        uint256 updateFee = IPyth(config.pyth.pyth).getUpdateFee(updateData);

        adapter.updatePrice{ value: updateFee }(updateData);
        registry.registerOracle(pairKey, ProviderLib.PYTH, address(adapter));

        IPriceOracle.PriceData memory data = registry.latestPrice(pairKey, ProviderLib.PYTH);

        assertEq(data.pairKey, pairKey, "Registry should return the Pyth adapter pair key");
        assertEq(data.providerKey, ProviderLib.PYTH, "Registry should return the Pyth provider key");
        assertGt(data.priceE18, 0, "Registry should return a non-zero Pyth price");
        assertGt(data.updatedAt, 0, "Registry should return a non-zero Pyth updatedAt timestamp");
    }

    function _fetchPythUpdateData(bytes32 priceId) private returns (bytes[] memory updateData) {
        string[] memory inputs = new string[](FETCH_PYTH_UPDATE_DATA_COMMAND_LENGTH);
        inputs[0] = "node";
        inputs[1] = "scripts-js/fetchPythUpdateData.js";
        inputs[2] = vm.toString(priceId);

        return abi.decode(vm.ffi(inputs), (bytes[]));
    }
}
