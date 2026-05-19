// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Test } from "forge-std/Test.sol";
import { IPriceOracle } from "../../contracts/oracle/interfaces/IPriceOracle.sol";
import { OracleRegistry } from "../../contracts/oracle/OracleRegistry.sol";
import { PairLib } from "../../contracts/oracle/lib/PairLib.sol";
import { ProviderLib } from "../../contracts/oracle/lib/ProviderLib.sol";
import { MockPriceOracle } from "../harnesses/MockPriceOracle.sol";

contract OracleRegistryTest is Test {
    event OracleAdapterRegistered(bytes32 indexed pairKey, bytes32 indexed providerKey, address indexed adapter);
    event OracleAdapterRemoved(bytes32 indexed pairKey, bytes32 indexed providerKey, address indexed adapter);

    address private owner = makeAddr("owner");
    address private notOwner = makeAddr("notOwner");

    bytes32 private hbarUsdPairKey = PairLib.pairKey("HBAR", "USD");
    bytes32 private btcUsdPairKey = PairLib.pairKey("BTC", "USD");
    bytes32 private chainlinkProviderKey = ProviderLib.CHAINLINK;
    bytes32 private supraProviderKey = ProviderLib.SUPRA;

    OracleRegistry private registry;
    MockPriceOracle private adapter;

    function setUp() public {
        registry = new OracleRegistry(owner);
        adapter = new MockPriceOracle(hbarUsdPairKey, chainlinkProviderKey, 0.25e18, block.timestamp);
    }

    function test_ConstructorSetsInitialOwner() public view {
        assertEq(registry.owner(), owner, "Registry owner should be the constructor initial owner");
    }

    function test_RegisterOracleStoresAdapter() public {
        vm.prank(owner);
        registry.registerOracle(hbarUsdPairKey, chainlinkProviderKey, address(adapter));

        assertEq(
            registry.getOracle(hbarUsdPairKey, chainlinkProviderKey),
            address(adapter),
            "Registry should store the adapter for the pair and provider"
        );
    }

    function test_RegisterOracleEmitsEvent() public {
        vm.expectEmit(true, true, true, false, address(registry));
        emit OracleAdapterRegistered(hbarUsdPairKey, chainlinkProviderKey, address(adapter));

        vm.prank(owner);
        registry.registerOracle(hbarUsdPairKey, chainlinkProviderKey, address(adapter));
    }

    function test_RegisterOracleReplacesExistingAdapter() public {
        MockPriceOracle replacementAdapter =
            new MockPriceOracle(hbarUsdPairKey, chainlinkProviderKey, 0.3e18, block.timestamp);

        vm.startPrank(owner);
        registry.registerOracle(hbarUsdPairKey, chainlinkProviderKey, address(adapter));
        registry.registerOracle(hbarUsdPairKey, chainlinkProviderKey, address(replacementAdapter));
        vm.stopPrank();

        assertEq(
            registry.getOracle(hbarUsdPairKey, chainlinkProviderKey),
            address(replacementAdapter),
            "Registry should replace an existing adapter for the same pair and provider"
        );
    }

    function test_RemoveOracleDeletesAdapter() public {
        vm.startPrank(owner);
        registry.registerOracle(hbarUsdPairKey, chainlinkProviderKey, address(adapter));
        registry.removeOracle(hbarUsdPairKey, chainlinkProviderKey);
        vm.stopPrank();

        vm.expectRevert(
            abi.encodeWithSelector(OracleRegistry.OracleAdapterNotFound.selector, hbarUsdPairKey, chainlinkProviderKey)
        );

        registry.getOracle(hbarUsdPairKey, chainlinkProviderKey);
    }

    function test_RemoveOracleEmitsEvent() public {
        vm.prank(owner);
        registry.registerOracle(hbarUsdPairKey, chainlinkProviderKey, address(adapter));

        vm.expectEmit(true, true, true, false, address(registry));
        emit OracleAdapterRemoved(hbarUsdPairKey, chainlinkProviderKey, address(adapter));

        vm.prank(owner);
        registry.removeOracle(hbarUsdPairKey, chainlinkProviderKey);
    }

    function test_LatestPriceReadsRegisteredAdapter() public {
        vm.prank(owner);
        registry.registerOracle(hbarUsdPairKey, chainlinkProviderKey, address(adapter));

        IPriceOracle.PriceData memory data = registry.latestPrice(hbarUsdPairKey, chainlinkProviderKey);

        assertEq(data.pairKey, hbarUsdPairKey, "Registry should return the adapter pair key");
        assertEq(data.providerKey, chainlinkProviderKey, "Registry should return the adapter provider key");
        assertEq(data.priceE18, 0.25e18, "Registry should return the adapter normalized price");
        assertEq(data.updatedAt, block.timestamp, "Registry should return the adapter updated timestamp");
    }

    function test_RevertWhen_RegisterOracleCallerIsNotOwner() public {
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, notOwner));

        vm.prank(notOwner);
        registry.registerOracle(hbarUsdPairKey, chainlinkProviderKey, address(adapter));
    }

    function test_RevertWhen_RemoveOracleCallerIsNotOwner() public {
        vm.prank(owner);
        registry.registerOracle(hbarUsdPairKey, chainlinkProviderKey, address(adapter));

        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, notOwner));

        vm.prank(notOwner);
        registry.removeOracle(hbarUsdPairKey, chainlinkProviderKey);
    }

    function test_RevertWhen_AdapterIsZero() public {
        vm.expectRevert(OracleRegistry.OracleAdapterIsZero.selector);

        vm.prank(owner);
        registry.registerOracle(hbarUsdPairKey, chainlinkProviderKey, address(0));
    }

    function test_RevertWhen_AdapterPairKeyDoesNotMatch() public {
        vm.expectRevert(
            abi.encodeWithSelector(OracleRegistry.OracleAdapterPairMismatch.selector, btcUsdPairKey, hbarUsdPairKey)
        );

        vm.prank(owner);
        registry.registerOracle(btcUsdPairKey, chainlinkProviderKey, address(adapter));
    }

    function test_RevertWhen_AdapterProviderKeyDoesNotMatch() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                OracleRegistry.OracleAdapterProviderMismatch.selector, supraProviderKey, chainlinkProviderKey
            )
        );

        vm.prank(owner);
        registry.registerOracle(hbarUsdPairKey, supraProviderKey, address(adapter));
    }

    function test_RevertWhen_GetOracleAdapterIsMissing() public {
        vm.expectRevert(
            abi.encodeWithSelector(OracleRegistry.OracleAdapterNotFound.selector, hbarUsdPairKey, chainlinkProviderKey)
        );

        registry.getOracle(hbarUsdPairKey, chainlinkProviderKey);
    }

    function test_RevertWhen_LatestPriceAdapterIsMissing() public {
        vm.expectRevert(
            abi.encodeWithSelector(OracleRegistry.OracleAdapterNotFound.selector, hbarUsdPairKey, chainlinkProviderKey)
        );

        registry.latestPrice(hbarUsdPairKey, chainlinkProviderKey);
    }
}
