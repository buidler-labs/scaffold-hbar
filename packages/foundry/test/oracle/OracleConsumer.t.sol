// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Test } from "forge-std/Test.sol";
import { OracleConsumer } from "../../contracts/oracle/OracleConsumer.sol";
import { OracleRegistry } from "../../contracts/oracle/OracleRegistry.sol";
import { PairLib } from "../../contracts/oracle/lib/PairLib.sol";
import { ProviderLib } from "../../contracts/oracle/lib/ProviderLib.sol";
import { MockPriceOracle } from "../harnesses/MockPriceOracle.sol";

contract OracleConsumerTest is Test {
    bytes32 private hbarUsdPairKey = PairLib.pairKey("HBAR", "USD");
    bytes32 private chainlinkProviderKey = ProviderLib.CHAINLINK;

    OracleRegistry private registry;
    OracleConsumer private consumer;

    function setUp() public {
        registry = new OracleRegistry(address(this));
        consumer = new OracleConsumer(address(registry));

        MockPriceOracle adapter = new MockPriceOracle(hbarUsdPairKey, chainlinkProviderKey, 0.25e18, block.timestamp);
        registry.registerOracle(hbarUsdPairKey, chainlinkProviderKey, address(adapter));
    }

    function test_BaseToQuoteConvertsThroughRegistryPrice() public view {
        uint256 quoteAmount = consumer.baseToQuote(hbarUsdPairKey, chainlinkProviderKey, 10 * 1e8, 8, 6);

        assertEq(quoteAmount, 2_500_000, "Consumer should convert ten HBAR to 2.5 USD with 6 decimals");
    }

    function test_QuoteToBaseConvertsThroughRegistryPrice() public view {
        uint256 baseAmount = consumer.quoteToBase(hbarUsdPairKey, chainlinkProviderKey, 2_500_000, 8, 6);

        assertEq(baseAmount, 10 * 1e8, "Consumer should convert 2.5 USD with 6 decimals to ten HBAR");
    }

    function test_RevertWhen_RegistryIsZero() public {
        vm.expectRevert(OracleConsumer.OracleRegistryIsZero.selector);

        new OracleConsumer(address(0));
    }

    function test_RevertWhen_OracleAdapterIsMissing() public {
        bytes32 missingPairKey = PairLib.pairKey("BTC", "USD");

        vm.expectRevert(
            abi.encodeWithSelector(OracleRegistry.OracleAdapterNotFound.selector, missingPairKey, chainlinkProviderKey)
        );

        consumer.baseToQuote(missingPairKey, chainlinkProviderKey, 1e8, 8, 6);
    }
}
