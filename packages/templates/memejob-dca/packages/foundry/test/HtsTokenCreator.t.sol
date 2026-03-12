// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import { HtsTokenCreator } from "../contracts/HtsTokenCreator.sol";

contract HtsTokenCreatorTest is Test {
    HtsTokenCreator public creator;

    uint8 public constant DECIMALS = 6;
    uint256 public constant HTS_CREATE_VALUE = 100_000_000; // 1 HBAR (10^8 tinybars)

    function setUp() public {
        creator = new HtsTokenCreator();
        vm.deal(address(this), 1000 ether);
    }

    function parseHtsUnits(uint256 amount) internal pure returns (uint256) {
        return amount * 10 ** DECIMALS;
    }

    function test_createToken_returnsNonZeroAddress() public {
        uint256 initialSupply = parseHtsUnits(10000);
        address tokenAddress = creator.createToken{ value: HTS_CREATE_VALUE }(
            "Test HTS Token",
            "THT",
            initialSupply,
            DECIMALS
        );
        assertNotEq(tokenAddress, address(0));
    }

    function test_createToken_callerIsTreasury() public {
        uint256 initialSupply = parseHtsUnits(1000);
        address tokenAddress = creator.createToken{ value: HTS_CREATE_VALUE }(
            "Treasury Token",
            "TRS",
            initialSupply,
            DECIMALS
        );
        assertNotEq(tokenAddress, address(0));
    }

    function test_mintToken_emitsTokenMinted() public {
        uint256 initialSupply = parseHtsUnits(1000);
        address tokenAddress = creator.createToken{ value: HTS_CREATE_VALUE }(
            "Mintable Token",
            "MNT",
            initialSupply,
            DECIMALS
        );

        uint256 mintAmount = parseHtsUnits(500);
        vm.expectEmit(true, true, true, true);
        emit HtsTokenCreator.TokenMinted(tokenAddress, int64(int256(initialSupply + mintAmount)));
        creator.mintToken(tokenAddress, mintAmount);
    }
}
