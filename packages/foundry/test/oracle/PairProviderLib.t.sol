// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Test } from "forge-std/Test.sol";
import { PairLib } from "../../contracts/oracle/lib/PairLib.sol";
import { ProviderLib } from "../../contracts/oracle/lib/ProviderLib.sol";
import { PairProviderLibHarness } from "../harnesses/PairProviderLibHarness.sol";

contract PairProviderLibTest is Test {
    PairProviderLibHarness private harness;

    function setUp() public {
        harness = new PairProviderLibHarness();
    }

    function test_PairKeyIsDeterministic() public pure {
        bytes32 firstKey = PairLib.pairKey("HBAR", "USD");
        bytes32 secondKey = PairLib.pairKey("HBAR", "USD");

        assertEq(firstKey, secondKey, "Pair keys should be deterministic for the same input");
        assertEq(firstKey, keccak256(abi.encode("HBAR", "USD")), "Pair key should use abi-encoded base and quote");
    }

    function test_PairKeyPreservesBaseQuoteOrdering() public pure {
        bytes32 hbarUsdKey = PairLib.pairKey("HBAR", "USD");
        bytes32 usdHbarKey = PairLib.pairKey("USD", "HBAR");

        assertNotEq(hbarUsdKey, usdHbarKey, "Pair keys should preserve base/quote ordering");
    }

    function test_PairKeyIsCaseSensitive() public pure {
        bytes32 uppercaseKey = PairLib.pairKey("HBAR", "USD");
        bytes32 mixedCaseKey = PairLib.pairKey("hbar", "usd");

        assertNotEq(uppercaseKey, mixedCaseKey, "Pair keys should be case-sensitive");
    }

    function test_RevertWhen_PairKeyHasEmptyBaseSymbol() public {
        vm.expectRevert(PairLib.EmptySymbol.selector);

        harness.pairKey("", "USD");
    }

    function test_RevertWhen_PairKeyHasEmptyQuoteSymbol() public {
        vm.expectRevert(PairLib.EmptySymbol.selector);

        harness.pairKey("HBAR", "");
    }

    function test_ProviderConstantsMatchProviderKeys() public pure {
        assertEq(ProviderLib.CHAINLINK, ProviderLib.providerKey("CHAINLINK"), "Chainlink constant should match key");
        assertEq(ProviderLib.SUPRA, ProviderLib.providerKey("SUPRA"), "Supra constant should match key");
        assertEq(ProviderLib.PYTH, ProviderLib.providerKey("PYTH"), "Pyth constant should match key");
    }

    function test_ProviderKeyIsDeterministic() public pure {
        bytes32 firstKey = ProviderLib.providerKey("CHAINLINK");
        bytes32 secondKey = ProviderLib.providerKey("CHAINLINK");

        assertEq(firstKey, secondKey, "Provider keys should be deterministic for the same input");
        assertEq(firstKey, keccak256(bytes("CHAINLINK")), "Provider key should hash the provider name bytes");
    }

    function test_ProviderKeyIsCaseSensitive() public pure {
        bytes32 uppercaseKey = ProviderLib.providerKey("CHAINLINK");
        bytes32 lowercaseKey = ProviderLib.providerKey("chainlink");

        assertNotEq(uppercaseKey, lowercaseKey, "Provider keys should be case-sensitive");
    }

    function test_RevertWhen_ProviderNameIsEmpty() public {
        vm.expectRevert(ProviderLib.EmptyProvider.selector);

        harness.providerKey("");
    }
}
