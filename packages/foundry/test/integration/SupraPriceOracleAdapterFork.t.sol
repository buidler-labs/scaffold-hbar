// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Test } from "forge-std/Test.sol";
import { IPriceOracle } from "../../contracts/oracle/interfaces/IPriceOracle.sol";
import { OracleConsumer } from "../../contracts/oracle/OracleConsumer.sol";
import { SupraPriceOracleAdapter } from "../../contracts/oracle/adapters/SupraPriceOracleAdapter.sol";
import { PairLib } from "../../contracts/oracle/lib/PairLib.sol";
import { ProviderLib } from "../../contracts/oracle/lib/ProviderLib.sol";
import { HelperConfig } from "../../script/HelperConfig.s.sol";

contract SupraPriceOracleAdapterForkTest is Test {
    uint256 private constant MAX_STALENESS = 365 days;
    uint256 private constant ONE_HBAR = 100_000_000;

    HelperConfig private helperConfig;
    HelperConfig.NetworkConfig private config;
    OracleConsumer private consumer;
    SupraPriceOracleAdapter private adapter;

    function setUp() public {
        helperConfig = new HelperConfig();
        config = helperConfig.getConfig();
        adapter = _deployAdapter();
        consumer = new OracleConsumer(address(adapter), address(this));
    }

    function test_Fork_LatestPriceReadsHbarUsdtFeed() public view {
        bytes32 pairKey = PairLib.pairKey("HBAR", "USDT");

        IPriceOracle.PriceData memory data = adapter.latestPrice(pairKey);

        assertEq(data.pairKey, pairKey, "Adapter should report the configured HBAR/USDT pair key");
        assertEq(data.providerKey, ProviderLib.SUPRA, "Adapter should report the Supra provider key");
        assertGt(data.priceE18, 0, "Adapter should return a non-zero HBAR/USDT price");
        assertGt(data.updatedAt, 0, "Adapter should return a non-zero HBAR/USDT updatedAt timestamp");
    }

    function test_Fork_LatestPriceReadsBtcUsdtFeed() public view {
        bytes32 pairKey = PairLib.pairKey("BTC", "USDT");

        IPriceOracle.PriceData memory data = adapter.latestPrice(pairKey);

        assertEq(data.pairKey, pairKey, "Adapter should report the configured BTC/USDT pair key");
        assertEq(data.providerKey, ProviderLib.SUPRA, "Adapter should report the Supra provider key");
        assertGt(data.priceE18, 0, "Adapter should return a non-zero BTC/USDT price");
        assertGt(data.updatedAt, 0, "Adapter should return a non-zero BTC/USDT updatedAt timestamp");
    }

    function test_Fork_LatestPriceReadsEthUsdtFeed() public view {
        bytes32 pairKey = PairLib.pairKey("ETH", "USDT");

        IPriceOracle.PriceData memory data = adapter.latestPrice(pairKey);

        assertEq(data.pairKey, pairKey, "Adapter should report the configured ETH/USDT pair key");
        assertEq(data.providerKey, ProviderLib.SUPRA, "Adapter should report the Supra provider key");
        assertGt(data.priceE18, 0, "Adapter should return a non-zero ETH/USDT price");
        assertGt(data.updatedAt, 0, "Adapter should return a non-zero ETH/USDT updatedAt timestamp");
    }

    function test_Fork_ConsumerConvertsUsingSelectedSupraAdapter() public view {
        bytes32 pairKey = PairLib.pairKey("HBAR", "USDT");

        uint256 quoteAmount = consumer.baseToQuote(pairKey, ONE_HBAR, 8, 6);
        uint256 baseAmount = consumer.quoteToBase(pairKey, 1_000_000, 8, 6);

        assertGt(quoteAmount, 0, "Consumer should convert HBAR to USDT with Supra adapter");
        assertGt(baseAmount, 0, "Consumer should convert USDT to HBAR with Supra adapter");
    }

    function _deployAdapter() private returns (SupraPriceOracleAdapter deployedAdapter) {
        SupraPriceOracleAdapter.PairConfig[] memory pairConfigs = new SupraPriceOracleAdapter.PairConfig[](3);
        pairConfigs[0] = SupraPriceOracleAdapter.PairConfig({
            pairKey: PairLib.pairKey("HBAR", "USDT"), supraPairId: config.supra.hbarUsdtPairId
        });
        pairConfigs[1] = SupraPriceOracleAdapter.PairConfig({
            pairKey: PairLib.pairKey("BTC", "USDT"), supraPairId: config.supra.btcUsdtPairId
        });
        pairConfigs[2] = SupraPriceOracleAdapter.PairConfig({
            pairKey: PairLib.pairKey("ETH", "USDT"), supraPairId: config.supra.ethUsdtPairId
        });

        return new SupraPriceOracleAdapter(config.supra.pushOracle, pairConfigs, MAX_STALENESS);
    }
}
