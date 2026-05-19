// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Test } from "forge-std/Test.sol";
import { ChainlinkPriceOracleAdapter } from "../../contracts/oracle/adapters/ChainlinkPriceOracleAdapter.sol";
import { IPriceOracle } from "../../contracts/oracle/interfaces/IPriceOracle.sol";
import { OracleRegistry } from "../../contracts/oracle/OracleRegistry.sol";
import { PairLib } from "../../contracts/oracle/lib/PairLib.sol";
import { ProviderLib } from "../../contracts/oracle/lib/ProviderLib.sol";
import { HelperConfig } from "../../script/HelperConfig.s.sol";

contract ChainlinkPriceOracleAdapterForkTest is Test {
    uint256 private constant MAX_STALENESS = 365 days;

    HelperConfig private helperConfig;
    HelperConfig.NetworkConfig private config;
    OracleRegistry private registry;

    function setUp() public {
        helperConfig = new HelperConfig();
        config = helperConfig.getConfig();
        registry = new OracleRegistry(address(this));
    }

    function test_Fork_LatestPriceReadsHbarUsdFeed() public {
        bytes32 pairKey = PairLib.pairKey("HBAR", "USD");
        ChainlinkPriceOracleAdapter adapter =
            new ChainlinkPriceOracleAdapter(pairKey, config.hbarUsdFeed, MAX_STALENESS);

        IPriceOracle.PriceData memory data = adapter.latestPrice();

        assertEq(data.pairKey, pairKey, "Adapter should report the configured HBAR/USD pair key");
        assertEq(data.providerKey, ProviderLib.CHAINLINK, "Adapter should report the Chainlink provider key");
        assertGt(data.priceE18, 0, "Adapter should return a non-zero HBAR/USD price");
        assertGt(data.updatedAt, 0, "Adapter should return a non-zero HBAR/USD updatedAt timestamp");
    }

    function test_Fork_LatestPriceReadsBtcUsdFeed() public {
        bytes32 pairKey = PairLib.pairKey("BTC", "USD");
        ChainlinkPriceOracleAdapter adapter = new ChainlinkPriceOracleAdapter(pairKey, config.btcUsdFeed, MAX_STALENESS);

        IPriceOracle.PriceData memory data = adapter.latestPrice();

        assertEq(data.pairKey, pairKey, "Adapter should report the configured BTC/USD pair key");
        assertEq(data.providerKey, ProviderLib.CHAINLINK, "Adapter should report the Chainlink provider key");
        assertGt(data.priceE18, 0, "Adapter should return a non-zero BTC/USD price");
        assertGt(data.updatedAt, 0, "Adapter should return a non-zero BTC/USD updatedAt timestamp");
    }

    function test_Fork_LatestPriceReadsEthUsdFeed() public {
        bytes32 pairKey = PairLib.pairKey("ETH", "USD");
        ChainlinkPriceOracleAdapter adapter = new ChainlinkPriceOracleAdapter(pairKey, config.ethUsdFeed, MAX_STALENESS);

        IPriceOracle.PriceData memory data = adapter.latestPrice();

        assertEq(data.pairKey, pairKey, "Adapter should report the configured ETH/USD pair key");
        assertEq(data.providerKey, ProviderLib.CHAINLINK, "Adapter should report the Chainlink provider key");
        assertGt(data.priceE18, 0, "Adapter should return a non-zero ETH/USD price");
        assertGt(data.updatedAt, 0, "Adapter should return a non-zero ETH/USD updatedAt timestamp");
    }

    function test_Fork_RegistryPassesThroughChainlinkPrice() public {
        bytes32 pairKey = PairLib.pairKey("HBAR", "USD");
        ChainlinkPriceOracleAdapter adapter =
            new ChainlinkPriceOracleAdapter(pairKey, config.hbarUsdFeed, MAX_STALENESS);

        registry.registerOracle(pairKey, ProviderLib.CHAINLINK, address(adapter));

        IPriceOracle.PriceData memory data = registry.latestPrice(pairKey, ProviderLib.CHAINLINK);

        assertEq(data.pairKey, pairKey, "Registry should return the Chainlink adapter pair key");
        assertEq(data.providerKey, ProviderLib.CHAINLINK, "Registry should return the Chainlink provider key");
        assertGt(data.priceE18, 0, "Registry should return a non-zero Chainlink price");
        assertGt(data.updatedAt, 0, "Registry should return a non-zero Chainlink updatedAt timestamp");
    }
}
