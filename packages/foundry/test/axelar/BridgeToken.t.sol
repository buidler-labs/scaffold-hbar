// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { BridgeToken } from "../../contracts/axelar/BridgeToken.sol";

contract BridgeTokenTest is Test {
    BridgeToken internal token;
    address internal alice = makeAddr("alice");
    address internal tm = makeAddr("tokenManager");
    address internal devMinter = makeAddr("devMinter");

    function setUp() public {
        token = new BridgeToken("Test", "TST", address(this), 100 ether, address(0));
    }

    function test_constructor_mints_initial_supply() public view {
        assertEq(token.balanceOf(address(this)), 100 ether);
    }

    function test_constructor_can_add_optional_dev_minter() public {
        BridgeToken devToken = new BridgeToken("Test", "TST", address(this), 0, devMinter);

        vm.prank(devMinter);
        devToken.mint(alice, 7 ether);

        assertEq(devToken.balanceOf(alice), 7 ether);
    }

    function test_mint_and_burn_by_minter() public {
        token.mint(alice, 1_000 ether);
        assertEq(token.balanceOf(alice), 1_000 ether);

        token.burn(alice, 100 ether);
        assertEq(token.balanceOf(alice), 900 ether);
    }

    function test_transfer_minter_to_tm_and_mint() public {
        token.transferMintership(tm);
        vm.prank(tm);
        token.mint(alice, 5 ether);
        assertEq(token.balanceOf(alice), 5 ether);
    }

    function test_non_minter_cannot_mint() public {
        vm.prank(alice);
        vm.expectRevert();
        token.mint(alice, 1);
    }
}
