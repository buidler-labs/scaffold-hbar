// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {ScheduledVaultFactory} from "../contracts/ScheduledVaultFactory.sol";
import {ScheduledVault} from "../contracts/ScheduledVault.sol";
import {MockExecutionStrategy} from "./mocks/MockExecutionStrategy.sol";

contract ScheduledVaultFactoryTest is Test {
  ScheduledVaultFactory internal factory;
  MockExecutionStrategy internal strategyA;
  MockExecutionStrategy internal strategyB;

  address internal user1 = makeAddr("user1");
  address internal user2 = makeAddr("user2");

  function setUp() public {
    factory = new ScheduledVaultFactory();
    strategyA = new MockExecutionStrategy();
    strategyB = new MockExecutionStrategy();
  }

  function test_createVaultDeploysVault() public {
    vm.prank(user1);
    address vaultAddr = factory.createVault(address(strategyA));

    assertNotEq(vaultAddr, address(0));
    ScheduledVault vault = ScheduledVault(payable(vaultAddr));
    assertEq(vault.owner(), user1);
    assertEq(address(vault.strategy()), address(strategyA));
  }

  function test_createVaultEmitsEvent() public {
    vm.prank(user1);
    vm.expectEmit(true, false, true, false);
    emit ScheduledVaultFactory.VaultCreated(user1, address(0), address(strategyA));
    factory.createVault(address(strategyA));
  }

  function test_createVaultRevertsOnZeroStrategy() public {
    vm.prank(user1);
    vm.expectRevert(ScheduledVaultFactory.ScheduledVaultFactory__InvalidStrategy.selector);
    factory.createVault(address(0));
  }

  function test_userCanCreateMultipleVaults() public {
    vm.startPrank(user1);
    address vault1 = factory.createVault(address(strategyA));
    address vault2 = factory.createVault(address(strategyB));
    vm.stopPrank();

    assertNotEq(vault1, vault2);

    assertEq(factory.userVaults(user1, 0), vault1);
    assertEq(factory.userVaults(user1, 1), vault2);
  }

  function test_userVaultsRevertsWhenEmpty() public {
    vm.expectRevert();
    factory.userVaults(user1, 0);
  }

  function test_userVaultsIndexingWorks() public {
    vm.startPrank(user1);
    address vault1 = factory.createVault(address(strategyA));
    address vault2 = factory.createVault(address(strategyB));
    vm.stopPrank();

    assertEq(factory.userVaults(user1, 0), vault1);
    assertEq(factory.userVaults(user1, 1), vault2);
    vm.expectRevert();
    factory.userVaults(user1, 2);
  }

  function test_differentUsersGetSeparateVaults() public {
    vm.prank(user1);
    address v1 = factory.createVault(address(strategyA));

    vm.prank(user2);
    address v2 = factory.createVault(address(strategyA));

    assertNotEq(v1, v2);
    assertEq(factory.userVaults(user1, 0), v1);
    assertEq(factory.userVaults(user2, 0), v2);
  }
}
