// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Test } from "forge-std/Test.sol";
import { ChainlinkPriceOracleAdapter } from "../../contracts/oracle/adapters/ChainlinkPriceOracleAdapter.sol";
import { IPriceOracle } from "../../contracts/oracle/interfaces/IPriceOracle.sol";
import { OracleConsumer } from "../../contracts/oracle/OracleConsumer.sol";
import { PairLib } from "../../contracts/oracle/lib/PairLib.sol";
import { ProviderLib } from "../../contracts/oracle/lib/ProviderLib.sol";
import { HelperConfig } from "../../script/HelperConfig.s.sol";

contract ChainlinkPriceOracleAdapterForkTest is Test {
    uint256 private constant MAX_STALENESS = 365 days;
    uint256 private constant ONE_HBAR = 100_000_000;

    HelperConfig private helperConfig;
    HelperConfig.NetworkConfig private config;
    OracleConsumer private consumer;
    ChainlinkPriceOracleAdapter private adapter;

    function setUp() public {
        helperConfig = new HelperConfig();
        config = helperConfig.getConfig();
        adapter = _deployAdapter();
        consumer = new OracleConsumer(address(adapter), address(this));
    }

    function test_Fork_LatestPriceReadsHbarUsdFeed() public view {
        bytes32 pairKey = PairLib.pairKey("HBAR", "USD");

        IPriceOracle.PriceData memory data = adapter.latestPrice(pairKey);

        assertEq(data.pairKey, pairKey, "Adapter should report the configured HBAR/USD pair key");
        assertEq(data.providerKey, ProviderLib.CHAINLINK, "Adapter should report the Chainlink provider key");
        assertGt(data.priceE18, 0, "Adapter should return a non-zero HBAR/USD price");
        assertGt(data.updatedAt, 0, "Adapter should return a non-zero HBAR/USD updatedAt timestamp");
    }

    function test_Fork_LatestPriceReadsBtcUsdFeed() public view {
        bytes32 pairKey = PairLib.pairKey("BTC", "USD");

        IPriceOracle.PriceData memory data = adapter.latestPrice(pairKey);

        assertEq(data.pairKey, pairKey, "Adapter should report the configured BTC/USD pair key");
        assertEq(data.providerKey, ProviderLib.CHAINLINK, "Adapter should report the Chainlink provider key");
        assertGt(data.priceE18, 0, "Adapter should return a non-zero BTC/USD price");
        assertGt(data.updatedAt, 0, "Adapter should return a non-zero BTC/USD updatedAt timestamp");
    }

    function test_Fork_LatestPriceReadsEthUsdFeed() public view {
        bytes32 pairKey = PairLib.pairKey("ETH", "USD");

        IPriceOracle.PriceData memory data = adapter.latestPrice(pairKey);

        assertEq(data.pairKey, pairKey, "Adapter should report the configured ETH/USD pair key");
        assertEq(data.providerKey, ProviderLib.CHAINLINK, "Adapter should report the Chainlink provider key");
        assertGt(data.priceE18, 0, "Adapter should return a non-zero ETH/USD price");
        assertGt(data.updatedAt, 0, "Adapter should return a non-zero ETH/USD updatedAt timestamp");
    }

    function test_Fork_ConsumerConvertsUsingSelectedChainlinkAdapter() public view {
        bytes32 pairKey = PairLib.pairKey("HBAR", "USD");

        uint256 quoteAmount = consumer.baseToQuote(pairKey, ONE_HBAR, 8, 6);
        uint256 baseAmount = consumer.quoteToBase(pairKey, 1_000_000, 8, 6);

        assertGt(quoteAmount, 0, "Consumer should convert HBAR to USD with Chainlink adapter");
        assertGt(baseAmount, 0, "Consumer should convert USD to HBAR with Chainlink adapter");
    }

    function _deployAdapter() private returns (ChainlinkPriceOracleAdapter deployedAdapter) {
        ChainlinkPriceOracleAdapter.FeedConfig[] memory feedConfigs = new ChainlinkPriceOracleAdapter.FeedConfig[](3);
        feedConfigs[0] = ChainlinkPriceOracleAdapter.FeedConfig({
            pairKey: PairLib.pairKey("HBAR", "USD"), feed: config.chainlink.hbarUsdFeed
        });
        feedConfigs[1] = ChainlinkPriceOracleAdapter.FeedConfig({
            pairKey: PairLib.pairKey("BTC", "USD"), feed: config.chainlink.btcUsdFeed
        });
        feedConfigs[2] = ChainlinkPriceOracleAdapter.FeedConfig({
            pairKey: PairLib.pairKey("ETH", "USD"), feed: config.chainlink.ethUsdFeed
        });

        return new ChainlinkPriceOracleAdapter(feedConfigs, MAX_STALENESS);
    }
}
