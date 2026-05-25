// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Test } from "forge-std/Test.sol";
import { IPriceOracle } from "../../contracts/oracle/interfaces/IPriceOracle.sol";
import { OracleRegistry } from "../../contracts/oracle/OracleRegistry.sol";
import { SupraPriceOracleAdapter } from "../../contracts/oracle/adapters/SupraPriceOracleAdapter.sol";
import { PairLib } from "../../contracts/oracle/lib/PairLib.sol";
import { ProviderLib } from "../../contracts/oracle/lib/ProviderLib.sol";
import { HelperConfig } from "../../script/HelperConfig.s.sol";

contract SupraPriceOracleAdapterForkTest is Test {
    uint256 private constant MAX_STALENESS = 365 days;

    HelperConfig private helperConfig;
    HelperConfig.NetworkConfig private config;
    OracleRegistry private registry;

    function setUp() public {
        helperConfig = new HelperConfig();
        config = helperConfig.getConfig();
        registry = new OracleRegistry(address(this));
    }

    function test_Fork_LatestPriceReadsHbarUsdtFeed() public {
        bytes32 pairKey = PairLib.pairKey("HBAR", "USDT");
        SupraPriceOracleAdapter adapter =
            new SupraPriceOracleAdapter(pairKey, config.supra.pushOracle, config.supra.hbarUsdtPairId, MAX_STALENESS);

        IPriceOracle.PriceData memory data = adapter.latestPrice();

        assertEq(data.pairKey, pairKey, "Adapter should report the configured HBAR/USDT pair key");
        assertEq(data.providerKey, ProviderLib.SUPRA, "Adapter should report the Supra provider key");
        assertGt(data.priceE18, 0, "Adapter should return a non-zero HBAR/USDT price");
        assertGt(data.updatedAt, 0, "Adapter should return a non-zero HBAR/USDT updatedAt timestamp");
    }

    function test_Fork_LatestPriceReadsBtcUsdtFeed() public {
        bytes32 pairKey = PairLib.pairKey("BTC", "USDT");
        SupraPriceOracleAdapter adapter =
            new SupraPriceOracleAdapter(pairKey, config.supra.pushOracle, config.supra.btcUsdtPairId, MAX_STALENESS);

        IPriceOracle.PriceData memory data = adapter.latestPrice();

        assertEq(data.pairKey, pairKey, "Adapter should report the configured BTC/USDT pair key");
        assertEq(data.providerKey, ProviderLib.SUPRA, "Adapter should report the Supra provider key");
        assertGt(data.priceE18, 0, "Adapter should return a non-zero BTC/USDT price");
        assertGt(data.updatedAt, 0, "Adapter should return a non-zero BTC/USDT updatedAt timestamp");
    }

    function test_Fork_LatestPriceReadsEthUsdtFeed() public {
        bytes32 pairKey = PairLib.pairKey("ETH", "USDT");
        SupraPriceOracleAdapter adapter =
            new SupraPriceOracleAdapter(pairKey, config.supra.pushOracle, config.supra.ethUsdtPairId, MAX_STALENESS);

        IPriceOracle.PriceData memory data = adapter.latestPrice();

        assertEq(data.pairKey, pairKey, "Adapter should report the configured ETH/USDT pair key");
        assertEq(data.providerKey, ProviderLib.SUPRA, "Adapter should report the Supra provider key");
        assertGt(data.priceE18, 0, "Adapter should return a non-zero ETH/USDT price");
        assertGt(data.updatedAt, 0, "Adapter should return a non-zero ETH/USDT updatedAt timestamp");
    }

    function test_Fork_RegistryPassesThroughSupraPrice() public {
        bytes32 pairKey = PairLib.pairKey("HBAR", "USDT");
        SupraPriceOracleAdapter adapter =
            new SupraPriceOracleAdapter(pairKey, config.supra.pushOracle, config.supra.hbarUsdtPairId, MAX_STALENESS);

        registry.registerOracle(pairKey, ProviderLib.SUPRA, address(adapter));

        IPriceOracle.PriceData memory data = registry.latestPrice(pairKey, ProviderLib.SUPRA);

        assertEq(data.pairKey, pairKey, "Registry should return the Supra adapter pair key");
        assertEq(data.providerKey, ProviderLib.SUPRA, "Registry should return the Supra provider key");
        assertGt(data.priceE18, 0, "Registry should return a non-zero Supra price");
        assertGt(data.updatedAt, 0, "Registry should return a non-zero Supra updatedAt timestamp");
    }
}
