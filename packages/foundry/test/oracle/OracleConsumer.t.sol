// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Test } from "forge-std/Test.sol";
import { IPriceOracle } from "../../contracts/oracle/interfaces/IPriceOracle.sol";
import { OracleConsumer } from "../../contracts/oracle/OracleConsumer.sol";
import { PairLib } from "../../contracts/oracle/lib/PairLib.sol";
import { ProviderLib } from "../../contracts/oracle/lib/ProviderLib.sol";
import { MockPriceOracle } from "../harnesses/MockPriceOracle.sol";

contract OracleConsumerTest is Test {
    event OracleUpdated(address indexed previousOracle, address indexed newOracle);

    uint256 private constant UPDATED_AT = 1_714_000_000;

    address private owner = makeAddr("owner");
    address private notOwner = makeAddr("notOwner");

    bytes32 private hbarUsdPairKey = PairLib.pairKey("HBAR", "USD");
    bytes32 private btcUsdPairKey = PairLib.pairKey("BTC", "USD");
    bytes32 private chainlinkProviderKey = ProviderLib.CHAINLINK;

    MockPriceOracle private adapter;
    OracleConsumer private consumer;

    function setUp() public {
        adapter = new MockPriceOracle(hbarUsdPairKey, chainlinkProviderKey, 0.25e18, UPDATED_AT);
        consumer = new OracleConsumer(address(adapter), owner);
    }

    function test_ConstructorSetsInitialOwner() public view {
        assertEq(consumer.owner(), owner, "Consumer owner should be the constructor initial owner");
    }

    function test_ConstructorSetsInitialOracle() public view {
        assertEq(address(consumer.oracle()), address(adapter), "Consumer should store the initial oracle");
    }

    function test_BaseToQuoteConvertsThroughSelectedOraclePrice() public view {
        uint256 quoteAmount = consumer.baseToQuote(hbarUsdPairKey, 10 * 1e8, 8, 6);

        assertEq(quoteAmount, 2_500_000, "Consumer should convert ten HBAR to 2.5 USD with 6 decimals");
    }

    function test_BaseToQuoteWithLatestUpdateReturnsQuoteAndTimestamp() public view {
        (uint256 quoteAmount, uint256 latestUpdate) =
            consumer.baseToQuoteWithLatestUpdate(hbarUsdPairKey, 10 * 1e8, 8, 6);

        assertEq(quoteAmount, 2_500_000, "Consumer should convert ten HBAR to 2.5 USD with 6 decimals");
        assertEq(latestUpdate, UPDATED_AT, "Consumer should return the upstream oracle update timestamp");
    }

    function test_QuoteToBaseConvertsThroughSelectedOraclePrice() public view {
        uint256 baseAmount = consumer.quoteToBase(hbarUsdPairKey, 2_500_000, 8, 6);

        assertEq(baseAmount, 10 * 1e8, "Consumer should convert 2.5 USD with 6 decimals to ten HBAR");
    }

    function test_SetOracleStoresNewOracle() public {
        MockPriceOracle replacement = new MockPriceOracle(hbarUsdPairKey, chainlinkProviderKey, 0.5e18, block.timestamp);

        vm.prank(owner);
        consumer.setOracle(address(replacement));

        assertEq(address(consumer.oracle()), address(replacement), "Consumer should store the replacement oracle");
    }

    function test_SetOracleEmitsEvent() public {
        MockPriceOracle replacement = new MockPriceOracle(hbarUsdPairKey, chainlinkProviderKey, 0.5e18, block.timestamp);

        vm.expectEmit(true, true, false, false, address(consumer));
        emit OracleUpdated(address(adapter), address(replacement));

        vm.prank(owner);
        consumer.setOracle(address(replacement));
    }

    function test_RevertWhen_OracleIsZeroInConstructor() public {
        vm.expectRevert(OracleConsumer.OracleIsZero.selector);

        new OracleConsumer(address(0), owner);
    }

    function test_RevertWhen_SetOracleCallerIsNotOwner() public {
        MockPriceOracle replacement = new MockPriceOracle(hbarUsdPairKey, chainlinkProviderKey, 0.5e18, block.timestamp);

        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, notOwner));

        vm.prank(notOwner);
        consumer.setOracle(address(replacement));
    }

    function test_RevertWhen_SetOracleIsZero() public {
        vm.expectRevert(OracleConsumer.OracleIsZero.selector);

        vm.prank(owner);
        consumer.setOracle(address(0));
    }

    function test_RevertWhen_OracleDoesNotSupportPair() public {
        vm.expectRevert(abi.encodeWithSelector(IPriceOracle.OracleUnsupportedPair.selector, btcUsdPairKey));

        consumer.baseToQuote(btcUsdPairKey, 1e8, 8, 6);
    }
}
