// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Test } from "forge-std/Test.sol";
import { PairLib } from "../../contracts/oracle/lib/PairLib.sol";
import { ProviderLib } from "../../contracts/oracle/lib/ProviderLib.sol";

contract PairProviderLibHarness {
    function pairKey(string memory baseSymbol, string memory quoteSymbol) external pure returns (bytes32) {
        return PairLib.pairKey(baseSymbol, quoteSymbol);
    }

    function providerKey(string memory providerName) external pure returns (bytes32) {
        return ProviderLib.providerKey(providerName);
    }
}

contract PairProviderLibTest is Test {
    PairProviderLibHarness private harness;

    function setUp() public {
        harness = new PairProviderLibHarness();
    }

    function testPairKeyIsDeterministic() public pure {
        bytes32 firstKey = PairLib.pairKey("HBAR", "USD");
        bytes32 secondKey = PairLib.pairKey("HBAR", "USD");

        assertEq(firstKey, secondKey, "Pair keys should be deterministic for the same input");
        assertEq(firstKey, keccak256(abi.encode("HBAR", "USD")), "Pair key should use abi-encoded base and quote");
    }

    function testPairKeyPreservesBaseQuoteOrdering() public pure {
        bytes32 hbarUsdKey = PairLib.pairKey("HBAR", "USD");
        bytes32 usdHbarKey = PairLib.pairKey("USD", "HBAR");

        assertNotEq(hbarUsdKey, usdHbarKey, "Pair keys should preserve base/quote ordering");
    }

    function testPairKeyIsCaseSensitive() public pure {
        bytes32 uppercaseKey = PairLib.pairKey("HBAR", "USD");
        bytes32 mixedCaseKey = PairLib.pairKey("hbar", "usd");

        assertNotEq(uppercaseKey, mixedCaseKey, "Pair keys should be case-sensitive");
    }

    function testPairKeyRevertsForEmptyBaseSymbol() public {
        vm.expectRevert(PairLib.EmptySymbol.selector);

        harness.pairKey("", "USD");
    }

    function testPairKeyRevertsForEmptyQuoteSymbol() public {
        vm.expectRevert(PairLib.EmptySymbol.selector);

        harness.pairKey("HBAR", "");
    }

    function testProviderConstantsMatchProviderKeys() public pure {
        assertEq(ProviderLib.CHAINLINK, ProviderLib.providerKey("CHAINLINK"), "Chainlink constant should match key");
        assertEq(ProviderLib.SUPRA, ProviderLib.providerKey("SUPRA"), "Supra constant should match key");
        assertEq(ProviderLib.PYTH, ProviderLib.providerKey("PYTH"), "Pyth constant should match key");
    }

    function testProviderKeyIsDeterministic() public pure {
        bytes32 firstKey = ProviderLib.providerKey("CHAINLINK");
        bytes32 secondKey = ProviderLib.providerKey("CHAINLINK");

        assertEq(firstKey, secondKey, "Provider keys should be deterministic for the same input");
        assertEq(firstKey, keccak256(bytes("CHAINLINK")), "Provider key should hash the provider name bytes");
    }

    function testProviderKeyIsCaseSensitive() public pure {
        bytes32 uppercaseKey = ProviderLib.providerKey("CHAINLINK");
        bytes32 lowercaseKey = ProviderLib.providerKey("chainlink");

        assertNotEq(uppercaseKey, lowercaseKey, "Provider keys should be case-sensitive");
    }

    function testProviderKeyRevertsForEmptyProviderName() public {
        vm.expectRevert(ProviderLib.EmptyProvider.selector);

        harness.providerKey("");
    }
}
