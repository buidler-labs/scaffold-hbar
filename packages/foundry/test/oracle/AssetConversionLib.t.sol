// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Test } from "forge-std/Test.sol";
import { AssetConversionLib } from "../../contracts/oracle/lib/AssetConversionLib.sol";
import { AssetConversionLibHarness } from "../harnesses/AssetConversionLibHarness.sol";

contract AssetConversionLibTest is Test {
    AssetConversionLibHarness private harness;

    function setUp() public {
        harness = new AssetConversionLibHarness();
    }

    function test_BaseToQuoteConvertsHbarEightDecimalsToUsdSixDecimals() public view {
        uint256 tenHbar = 10 * 1e8;
        uint256 hbarUsdPriceE18 = 0.25e18;

        uint256 quoteAmount = harness.baseToQuote(tenHbar, 8, 6, hbarUsdPriceE18);

        assertEq(quoteAmount, 2_500_000, "Ten HBAR at $0.25 should equal 2.5 USD with 6 decimals");
    }

    function test_QuoteToBaseConvertsUsdSixDecimalsToHbarEightDecimals() public view {
        uint256 twoPointFiveUsd = 2_500_000;
        uint256 hbarUsdPriceE18 = 0.25e18;

        uint256 baseAmount = harness.quoteToBase(twoPointFiveUsd, 8, 6, hbarUsdPriceE18);

        assertEq(baseAmount, 10 * 1e8, "2.5 USD at $0.25 per HBAR should equal ten HBAR");
    }

    function test_BaseToQuoteConvertsEthEighteenDecimalsToUsdSixDecimals() public view {
        uint256 onePointFiveEth = 1.5e18;
        uint256 ethUsdPriceE18 = 2_000e18;

        uint256 quoteAmount = harness.baseToQuote(onePointFiveEth, 18, 6, ethUsdPriceE18);

        assertEq(quoteAmount, 3_000_000_000, "1.5 ETH at $2,000 should equal 3,000 USD with 6 decimals");
    }

    function test_QuoteToBaseConvertsUsdSixDecimalsToEthEighteenDecimals() public view {
        uint256 threeThousandUsd = 3_000_000_000;
        uint256 ethUsdPriceE18 = 2_000e18;

        uint256 baseAmount = harness.quoteToBase(threeThousandUsd, 18, 6, ethUsdPriceE18);

        assertEq(baseAmount, 1.5e18, "3,000 USD at $2,000 per ETH should equal 1.5 ETH");
    }

    function test_BaseToQuoteConvertsBtcEightDecimalsToQuoteEightDecimals() public view {
        uint256 halfBtc = 0.5e8;
        uint256 btcUsdPriceE18 = 64_000e18;

        uint256 quoteAmount = harness.baseToQuote(halfBtc, 8, 8, btcUsdPriceE18);

        assertEq(quoteAmount, 32_000e8, "0.5 BTC at $64,000 should equal 32,000 quote units with 8 decimals");
    }

    function test_BaseToQuoteReturnsZeroForZeroBaseAmount() public view {
        uint256 quoteAmount = harness.baseToQuote(0, 8, 6, 0.25e18);

        assertEq(quoteAmount, 0, "Zero base amount should convert to zero quote amount");
    }

    function test_QuoteToBaseReturnsZeroForZeroQuoteAmount() public view {
        uint256 baseAmount = harness.quoteToBase(0, 8, 6, 0.25e18);

        assertEq(baseAmount, 0, "Zero quote amount should convert to zero base amount");
    }

    function test_BaseToQuoteRoundsDown() public view {
        uint256 quoteAmount = harness.baseToQuote(1, 0, 0, 0.5e18);

        assertEq(quoteAmount, 0, "Base to quote conversion should round down fractional quote units");
    }

    function test_QuoteToBaseRoundsDown() public view {
        uint256 baseAmount = harness.quoteToBase(1, 0, 0, 2e18);

        assertEq(baseAmount, 0, "Quote to base conversion should round down fractional base units");
    }

    function test_RevertWhen_BaseToQuotePriceIsZero() public {
        vm.expectRevert(AssetConversionLib.InvalidPrice.selector);

        harness.baseToQuote(1e8, 8, 6, 0);
    }

    function test_RevertWhen_QuoteToBasePriceIsZero() public {
        vm.expectRevert(AssetConversionLib.InvalidPrice.selector);

        harness.quoteToBase(1_000_000, 8, 6, 0);
    }
}
