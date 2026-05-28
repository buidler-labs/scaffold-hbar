// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Test } from "forge-std/Test.sol";
import { MockPyth } from "@pythnetwork/pyth-sdk-solidity/MockPyth.sol";
import { IPriceOracle } from "../../contracts/oracle/interfaces/IPriceOracle.sol";
import { PythPriceOracleAdapter } from "../../contracts/oracle/adapters/PythPriceOracleAdapter.sol";
import { PairLib } from "../../contracts/oracle/lib/PairLib.sol";
import { ProviderLib } from "../../contracts/oracle/lib/ProviderLib.sol";

contract PythPriceOracleAdapterTest is Test {
    uint256 private constant MAX_STALENESS = 1 hours;
    uint64 private constant PUBLISH_TIME = 1_700_000_000;
    bytes32 private constant PRICE_ID = bytes32(uint256(0x3003));
    bytes32 private hbarUsdPairKey = PairLib.pairKey("HBAR", "USD");

    MockPyth private pyth;
    PythPriceOracleAdapter private adapter;

    function setUp() public {
        vm.warp(PUBLISH_TIME);
        pyth = new MockPyth(MAX_STALENESS, 0);

        PythPriceOracleAdapter.PriceConfig[] memory priceConfigs = new PythPriceOracleAdapter.PriceConfig[](1);
        priceConfigs[0] = PythPriceOracleAdapter.PriceConfig({ pairKey: hbarUsdPairKey, priceId: PRICE_ID });

        adapter = new PythPriceOracleAdapter(address(pyth), priceConfigs, MAX_STALENESS);
    }

    function test_LatestPriceAcceptsZeroConfidence() public {
        _updateMockPythPrice(200_000_000, 0);

        IPriceOracle.PriceData memory data = adapter.latestPrice(hbarUsdPairKey);

        assertEq(data.pairKey, hbarUsdPairKey, "Adapter should report the requested pair key");
        assertEq(data.providerKey, ProviderLib.PYTH, "Adapter should report the Pyth provider key");
        assertEq(data.priceE18, 2e18, "Adapter should normalize a zero-confidence price");
        assertEq(data.updatedAt, block.timestamp, "Adapter should report the Pyth publish timestamp");
    }

    function test_RevertWhen_PythConfidenceExceedsPrice() public {
        _updateMockPythPrice(200_000_000, 200_000_001);

        vm.expectRevert(PythPriceOracleAdapter.PythInvalidConfidence.selector);

        adapter.latestPrice(hbarUsdPairKey);
    }

    function _updateMockPythPrice(int64 price, uint64 conf) private {
        bytes[] memory updateData = new bytes[](1);
        updateData[0] = pyth.createPriceFeedUpdateData(PRICE_ID, price, conf, -8, price, conf, PUBLISH_TIME);

        pyth.updatePriceFeeds(updateData);
    }
}
