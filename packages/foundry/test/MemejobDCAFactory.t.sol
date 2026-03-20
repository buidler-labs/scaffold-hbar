// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {MemejobDCAFactory} from "../contracts/MemejobDCAFactory.sol";
import {MemejobDCAVault} from "../contracts/MemejobDCAVault.sol";


contract MemejobDCAFactoryTest is Test {
  address constant MEMEJOB_TESTNET = 0xA3bf9adeC2Fb49fb65C8948Aed71C6bf1c4D61c8;

  MemejobDCAFactory factory;

  address USER1 = makeAddr("user1");
  address USER2 = makeAddr("user2");

  address PLACEHOLDER_VAULT = address(0x123);

  function setUp() public {
    factory = new MemejobDCAFactory(MEMEJOB_TESTNET);
  }

  function test_memejobAddressSetCorrectly() public view {
    assertEq(factory.memejob(), MEMEJOB_TESTNET);
  }

  function test_createVault() public {
    vm.prank(USER1);
    vm.expectEmit(true, true, false, false);
    emit MemejobDCAFactory.VaultCreated(USER1, PLACEHOLDER_VAULT);
    address vaultAddr = factory.createVault();

    assertEq(factory.userVault(USER1), vaultAddr, "Vault address mismatch");
    assertNotEq(vaultAddr, address(0), "Vault address is zero");

    MemejobDCAVault vault = MemejobDCAVault(payable(vaultAddr));
    assertEq(address(vault.memejob()), MEMEJOB_TESTNET, "Memejob address mismatch");
    assertEq(vault.owner(), USER1, "Owner mismatch");
  }

  function test_createVaultRevertsIfAlreadyHasVault() public {
    vm.prank(USER1);
    factory.createVault();

    vm.prank(USER1);
    vm.expectRevert(MemejobDCAFactory.MemejobDCAFactory__AlreadyHasVault.selector);
    factory.createVault();
  }

  function test_constructorRevertsIfZeroAddress() public {
    vm.expectRevert(MemejobDCAFactory.MemejobDCAFactory__InvalidMemejob.selector);
    new MemejobDCAFactory(address(0));
  }

  function test_multipleUsersGetDifferentVaults() public {
    vm.prank(USER1);
    address vault1 = factory.createVault();

    vm.prank(USER2);
    address vault2 = factory.createVault();

    assertNotEq(vault1, vault2, "Vault addresses are the same");
    assertEq(factory.userVault(USER1), vault1, "Vault address mismatch for USER1");
    assertEq(factory.userVault(USER2), vault2, "Vault address mismatch for USER2");
  }
}
