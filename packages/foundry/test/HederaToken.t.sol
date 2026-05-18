// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Test } from "forge-std/Test.sol";
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
        bool ok = token.transfer(alice, 100 * 10 ** token.decimals());
        require(ok, "transfer failed");
        assertEq(token.balanceOf(alice), 100 * 10 ** token.decimals());
    }
}
