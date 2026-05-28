// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Test } from "forge-std/Test.sol";
import { ChainlinkPriceOracleAdapter } from "../../contracts/oracle/adapters/ChainlinkPriceOracleAdapter.sol";
import { PythPriceOracleAdapter } from "../../contracts/oracle/adapters/PythPriceOracleAdapter.sol";
import { SupraPriceOracleAdapter } from "../../contracts/oracle/adapters/SupraPriceOracleAdapter.sol";
import { PairLib } from "../../contracts/oracle/lib/PairLib.sol";

contract OracleAdapterConfigTest is Test {
    uint256 private constant MAX_STALENESS = 1 days;
    address private constant FEED = address(0x1001);
    address private constant ORACLE = address(0x2002);
    bytes32 private constant PRICE_ID = bytes32(uint256(0x3003));

    bytes32 private hbarUsdPairKey = PairLib.pairKey("HBAR", "USD");
    bytes32 private btcUsdPairKey = PairLib.pairKey("BTC", "USD");

    function test_ChainlinkConstructorStoresMultipleFeeds() public {
        ChainlinkPriceOracleAdapter.FeedConfig[] memory feedConfigs = new ChainlinkPriceOracleAdapter.FeedConfig[](2);
        feedConfigs[0] = ChainlinkPriceOracleAdapter.FeedConfig({ pairKey: hbarUsdPairKey, feed: FEED });
        feedConfigs[1] = ChainlinkPriceOracleAdapter.FeedConfig({ pairKey: btcUsdPairKey, feed: address(0x1002) });

        ChainlinkPriceOracleAdapter adapter = new ChainlinkPriceOracleAdapter(feedConfigs, MAX_STALENESS);

        assertEq(adapter.getFeed(hbarUsdPairKey), FEED, "Adapter should store the HBAR/USD feed");
        assertEq(adapter.getFeed(btcUsdPairKey), address(0x1002), "Adapter should store the BTC/USD feed");
    }

    function test_RevertWhen_ChainlinkConfigIsEmpty() public {
        ChainlinkPriceOracleAdapter.FeedConfig[] memory feedConfigs = new ChainlinkPriceOracleAdapter.FeedConfig[](0);

        vm.expectRevert(ChainlinkPriceOracleAdapter.OracleConfigIsEmpty.selector);

        new ChainlinkPriceOracleAdapter(feedConfigs, MAX_STALENESS);
    }

    function test_RevertWhen_ChainlinkPairKeyIsZero() public {
        ChainlinkPriceOracleAdapter.FeedConfig[] memory feedConfigs = new ChainlinkPriceOracleAdapter.FeedConfig[](1);
        feedConfigs[0] = ChainlinkPriceOracleAdapter.FeedConfig({ pairKey: bytes32(0), feed: FEED });

        vm.expectRevert(ChainlinkPriceOracleAdapter.OraclePairKeyIsZero.selector);

        new ChainlinkPriceOracleAdapter(feedConfigs, MAX_STALENESS);
    }

    function test_RevertWhen_ChainlinkFeedIsZero() public {
        ChainlinkPriceOracleAdapter.FeedConfig[] memory feedConfigs = new ChainlinkPriceOracleAdapter.FeedConfig[](1);
        feedConfigs[0] = ChainlinkPriceOracleAdapter.FeedConfig({ pairKey: hbarUsdPairKey, feed: address(0) });

        vm.expectRevert(ChainlinkPriceOracleAdapter.ChainlinkFeedIsZero.selector);

        new ChainlinkPriceOracleAdapter(feedConfigs, MAX_STALENESS);
    }

    function test_RevertWhen_ChainlinkPairIsDuplicated() public {
        ChainlinkPriceOracleAdapter.FeedConfig[] memory feedConfigs = new ChainlinkPriceOracleAdapter.FeedConfig[](2);
        feedConfigs[0] = ChainlinkPriceOracleAdapter.FeedConfig({ pairKey: hbarUsdPairKey, feed: FEED });
        feedConfigs[1] = ChainlinkPriceOracleAdapter.FeedConfig({ pairKey: hbarUsdPairKey, feed: address(0x1002) });

        vm.expectRevert(
            abi.encodeWithSelector(ChainlinkPriceOracleAdapter.OraclePairAlreadyConfigured.selector, hbarUsdPairKey)
        );

        new ChainlinkPriceOracleAdapter(feedConfigs, MAX_STALENESS);
    }

    function test_RevertWhen_SupraConfigIsEmpty() public {
        SupraPriceOracleAdapter.PairConfig[] memory pairConfigs = new SupraPriceOracleAdapter.PairConfig[](0);

        vm.expectRevert(SupraPriceOracleAdapter.OracleConfigIsEmpty.selector);

        new SupraPriceOracleAdapter(ORACLE, pairConfigs, MAX_STALENESS);
    }

    function test_RevertWhen_SupraOracleIsZero() public {
        SupraPriceOracleAdapter.PairConfig[] memory pairConfigs = _supraPairConfigs();

        vm.expectRevert(SupraPriceOracleAdapter.SupraOracleIsZero.selector);

        new SupraPriceOracleAdapter(address(0), pairConfigs, MAX_STALENESS);
    }

    function test_RevertWhen_SupraPairKeyIsZero() public {
        SupraPriceOracleAdapter.PairConfig[] memory pairConfigs = new SupraPriceOracleAdapter.PairConfig[](1);
        pairConfigs[0] = SupraPriceOracleAdapter.PairConfig({ pairKey: bytes32(0), supraPairId: 75 });

        vm.expectRevert(SupraPriceOracleAdapter.OraclePairKeyIsZero.selector);

        new SupraPriceOracleAdapter(ORACLE, pairConfigs, MAX_STALENESS);
    }

    function test_RevertWhen_SupraPairIsDuplicated() public {
        SupraPriceOracleAdapter.PairConfig[] memory pairConfigs = new SupraPriceOracleAdapter.PairConfig[](2);
        pairConfigs[0] = SupraPriceOracleAdapter.PairConfig({ pairKey: hbarUsdPairKey, supraPairId: 75 });
        pairConfigs[1] = SupraPriceOracleAdapter.PairConfig({ pairKey: hbarUsdPairKey, supraPairId: 76 });

        vm.expectRevert(
            abi.encodeWithSelector(SupraPriceOracleAdapter.OraclePairAlreadyConfigured.selector, hbarUsdPairKey)
        );

        new SupraPriceOracleAdapter(ORACLE, pairConfigs, MAX_STALENESS);
    }

    function test_RevertWhen_PythConfigIsEmpty() public {
        PythPriceOracleAdapter.PriceConfig[] memory priceConfigs = new PythPriceOracleAdapter.PriceConfig[](0);

        vm.expectRevert(PythPriceOracleAdapter.OracleConfigIsEmpty.selector);

        new PythPriceOracleAdapter(ORACLE, priceConfigs, MAX_STALENESS);
    }

    function test_RevertWhen_PythOracleIsZero() public {
        PythPriceOracleAdapter.PriceConfig[] memory priceConfigs = _pythPriceConfigs();

        vm.expectRevert(PythPriceOracleAdapter.PythOracleIsZero.selector);

        new PythPriceOracleAdapter(address(0), priceConfigs, MAX_STALENESS);
    }

    function test_RevertWhen_PythPairKeyIsZero() public {
        PythPriceOracleAdapter.PriceConfig[] memory priceConfigs = new PythPriceOracleAdapter.PriceConfig[](1);
        priceConfigs[0] = PythPriceOracleAdapter.PriceConfig({ pairKey: bytes32(0), priceId: PRICE_ID });

        vm.expectRevert(PythPriceOracleAdapter.OraclePairKeyIsZero.selector);

        new PythPriceOracleAdapter(ORACLE, priceConfigs, MAX_STALENESS);
    }

    function test_RevertWhen_PythPriceIdIsZero() public {
        PythPriceOracleAdapter.PriceConfig[] memory priceConfigs = new PythPriceOracleAdapter.PriceConfig[](1);
        priceConfigs[0] = PythPriceOracleAdapter.PriceConfig({ pairKey: hbarUsdPairKey, priceId: bytes32(0) });

        vm.expectRevert(PythPriceOracleAdapter.PythPriceIdIsZero.selector);

        new PythPriceOracleAdapter(ORACLE, priceConfigs, MAX_STALENESS);
    }

    function test_RevertWhen_PythPairIsDuplicated() public {
        PythPriceOracleAdapter.PriceConfig[] memory priceConfigs = new PythPriceOracleAdapter.PriceConfig[](2);
        priceConfigs[0] = PythPriceOracleAdapter.PriceConfig({ pairKey: hbarUsdPairKey, priceId: PRICE_ID });
        priceConfigs[1] =
            PythPriceOracleAdapter.PriceConfig({ pairKey: hbarUsdPairKey, priceId: bytes32(uint256(0x3004)) });

        vm.expectRevert(
            abi.encodeWithSelector(PythPriceOracleAdapter.OraclePairAlreadyConfigured.selector, hbarUsdPairKey)
        );

        new PythPriceOracleAdapter(ORACLE, priceConfigs, MAX_STALENESS);
    }

    function _supraPairConfigs() private view returns (SupraPriceOracleAdapter.PairConfig[] memory pairConfigs) {
        pairConfigs = new SupraPriceOracleAdapter.PairConfig[](1);
        pairConfigs[0] = SupraPriceOracleAdapter.PairConfig({ pairKey: hbarUsdPairKey, supraPairId: 75 });
    }

    function _pythPriceConfigs() private view returns (PythPriceOracleAdapter.PriceConfig[] memory priceConfigs) {
        priceConfigs = new PythPriceOracleAdapter.PriceConfig[](1);
        priceConfigs[0] = PythPriceOracleAdapter.PriceConfig({ pairKey: hbarUsdPairKey, priceId: PRICE_ID });
    }
}
