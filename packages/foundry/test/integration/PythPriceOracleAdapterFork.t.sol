// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Test } from "forge-std/Test.sol";
import { IPyth } from "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import { IPriceOracle } from "../../contracts/oracle/interfaces/IPriceOracle.sol";
import { OracleConsumer } from "../../contracts/oracle/OracleConsumer.sol";
import { PythPriceOracleAdapter } from "../../contracts/oracle/adapters/PythPriceOracleAdapter.sol";
import { PairLib } from "../../contracts/oracle/lib/PairLib.sol";
import { ProviderLib } from "../../contracts/oracle/lib/ProviderLib.sol";
import { HelperConfig } from "../../script/HelperConfig.s.sol";

contract PythPriceOracleAdapterForkTest is Test {
    uint256 private constant MAX_STALENESS = 1 hours;
    uint256 private constant TEST_NATIVE_BALANCE = 1 ether;
    uint256 private constant FETCH_PYTH_UPDATE_DATA_COMMAND_LENGTH = 3;
    uint256 private constant ONE_HBAR = 100_000_000;

    HelperConfig private helperConfig;
    HelperConfig.NetworkConfig private config;
    OracleConsumer private consumer;
    PythPriceOracleAdapter private adapter;

    function setUp() public {
        helperConfig = new HelperConfig();
        config = helperConfig.getConfig();
        adapter = _deployAdapter();
        consumer = new OracleConsumer(address(adapter), address(this));

        vm.deal(address(this), TEST_NATIVE_BALANCE);
    }

    function test_Fork_UpdateAndLatestPriceReadsHbarUsdFeed() public {
        bytes32 pairKey = PairLib.pairKey("HBAR", "USD");

        bytes[] memory updateData = _fetchPythUpdateData(config.pyth.hbarUsdPriceId);
        uint256 updateFee = IPyth(config.pyth.pyth).getUpdateFee(updateData);

        adapter.updatePrice{ value: updateFee }(updateData);

        IPriceOracle.PriceData memory data = adapter.latestPrice(pairKey);

        assertEq(data.pairKey, pairKey, "Adapter should report the configured HBAR/USD pair key");
        assertEq(data.providerKey, ProviderLib.PYTH, "Adapter should report the Pyth provider key");
        assertGt(data.priceE18, 0, "Adapter should return a non-zero HBAR/USD price");
        assertGt(data.updatedAt, 0, "Adapter should return a non-zero HBAR/USD updatedAt timestamp");
    }

    function test_Fork_UpdateAndLatestPriceReadsBtcUsdFeed() public {
        bytes32 pairKey = PairLib.pairKey("BTC", "USD");

        bytes[] memory updateData = _fetchPythUpdateData(config.pyth.btcUsdPriceId);
        uint256 updateFee = IPyth(config.pyth.pyth).getUpdateFee(updateData);

        adapter.updatePrice{ value: updateFee }(updateData);

        IPriceOracle.PriceData memory data = adapter.latestPrice(pairKey);

        assertEq(data.pairKey, pairKey, "Adapter should report the configured BTC/USD pair key");
        assertEq(data.providerKey, ProviderLib.PYTH, "Adapter should report the Pyth provider key");
        assertGt(data.priceE18, 0, "Adapter should return a non-zero BTC/USD price");
        assertGt(data.updatedAt, 0, "Adapter should return a non-zero BTC/USD updatedAt timestamp");
    }

    function test_Fork_UpdateAndLatestPriceReadsEthUsdFeed() public {
        bytes32 pairKey = PairLib.pairKey("ETH", "USD");

        bytes[] memory updateData = _fetchPythUpdateData(config.pyth.ethUsdPriceId);
        uint256 updateFee = IPyth(config.pyth.pyth).getUpdateFee(updateData);

        adapter.updatePrice{ value: updateFee }(updateData);

        IPriceOracle.PriceData memory data = adapter.latestPrice(pairKey);

        assertEq(data.pairKey, pairKey, "Adapter should report the configured ETH/USD pair key");
        assertEq(data.providerKey, ProviderLib.PYTH, "Adapter should report the Pyth provider key");
        assertGt(data.priceE18, 0, "Adapter should return a non-zero ETH/USD price");
        assertGt(data.updatedAt, 0, "Adapter should return a non-zero ETH/USD updatedAt timestamp");
    }

    function test_Fork_ConsumerConvertsUsingSelectedPythAdapterAfterUpdate() public {
        bytes32 pairKey = PairLib.pairKey("HBAR", "USD");

        bytes[] memory updateData = _fetchPythUpdateData(config.pyth.hbarUsdPriceId);
        uint256 updateFee = IPyth(config.pyth.pyth).getUpdateFee(updateData);

        adapter.updatePrice{ value: updateFee }(updateData);

        uint256 quoteAmount = consumer.baseToQuote(pairKey, ONE_HBAR, 8, 6);
        uint256 baseAmount = consumer.quoteToBase(pairKey, 1_000_000, 8, 6);

        assertGt(quoteAmount, 0, "Consumer should convert HBAR to USD with Pyth adapter");
        assertGt(baseAmount, 0, "Consumer should convert USD to HBAR with Pyth adapter");
    }

    function _deployAdapter() private returns (PythPriceOracleAdapter deployedAdapter) {
        PythPriceOracleAdapter.PriceConfig[] memory priceConfigs = new PythPriceOracleAdapter.PriceConfig[](3);
        priceConfigs[0] = PythPriceOracleAdapter.PriceConfig({
            pairKey: PairLib.pairKey("HBAR", "USD"), priceId: config.pyth.hbarUsdPriceId
        });
        priceConfigs[1] = PythPriceOracleAdapter.PriceConfig({
            pairKey: PairLib.pairKey("BTC", "USD"), priceId: config.pyth.btcUsdPriceId
        });
        priceConfigs[2] = PythPriceOracleAdapter.PriceConfig({
            pairKey: PairLib.pairKey("ETH", "USD"), priceId: config.pyth.ethUsdPriceId
        });

        return new PythPriceOracleAdapter(config.pyth.pyth, priceConfigs, MAX_STALENESS);
    }

    function _fetchPythUpdateData(bytes32 priceId) private returns (bytes[] memory updateData) {
        string[] memory inputs = new string[](FETCH_PYTH_UPDATE_DATA_COMMAND_LENGTH);
        inputs[0] = "node";
        inputs[1] = "scripts-js/fetchPythUpdateData.js";
        inputs[2] = vm.toString(priceId);

        return abi.decode(vm.ffi(inputs), (bytes[]));
    }
}
