// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import { HederaToken } from "../contracts/HederaToken.sol";

contract HederaTokenTest is Test {
    HederaToken public token;
    address public owner;

    function setUp() public {
        owner = address(this);
        token = new HederaToken(owner);
    }

    function test_nameAndSymbol() public view {
        assertEq(token.name(), "HederaToken");
        assertEq(token.symbol(), "HTK");
    }

    function test_initialSupplyToOwner() public view {
        assertEq(token.balanceOf(owner), 10000 * 10 ** token.decimals());
    }

    function test_transfer() public {
        address alice = makeAddr("alice");
        token.transfer(alice, 100 * 10 ** token.decimals());
        assertEq(token.balanceOf(alice), 100 * 10 ** token.decimals());
    }
}
