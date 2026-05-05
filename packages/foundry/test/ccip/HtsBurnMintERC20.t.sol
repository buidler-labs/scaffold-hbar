// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// ─────────────────────────────────────────────────────────────────────────────
// HtsBurnMintERC20 unit tests
//
// Uses hedera-forking's `htsSetup()` helper, which etches the real HTS system
// contract emulation at address 0x167.  No Hashio / Mirror Node traffic is
// involved: locally-created tokens (via `createFungibleToken`) mark themselves
// initialised, so subsequent `mintToken`/`burnToken` calls never hit FFI.
// ─────────────────────────────────────────────────────────────────────────────

import { Test } from "forge-std/Test.sol";
import { htsSetup } from "hedera-forking/htsSetup.sol";
import { IERC20 as HtsIERC20 } from "hedera-forking/IERC20.sol";
import { HTSBurnMintERC20 } from "../../contracts/ccip/HTSBurnMintERC20.sol";
import { HtsBurnMintTokenPool } from "../../contracts/ccip/HtsBurnMintTokenPool.sol";

contract HtsBurnerHarness {
    function approveAndBurn(HTSBurnMintERC20 wrapper, uint256 amount) external {
        HtsIERC20(wrapper.htsToken()).approve(address(wrapper), amount);
        wrapper.burn(amount);
    }
}

contract HtsBurnMintERC20Test is Test {
    address internal constant HTS_PRECOMPILE = address(0x167);

    address internal owner;
    address internal alice = makeAddr("alice");
    address internal pool = makeAddr("pool");
    address internal router = makeAddr("router");
    address internal rmnProxy = makeAddr("rmnProxy");

    HTSBurnMintERC20 internal token;

    uint256 internal constant PRE_MINT = 100e8; // 100 tokens, 8 decimals

    function setUp() public {
        htsSetup();
        owner = address(this);

        vm.deal(owner, 20 ether);
        token = new HTSBurnMintERC20{ value: 15 ether }("BestToken", "BTK", 8, PRE_MINT);
    }

    function test_deploy_creates_hts_token_and_premints() public view {
        assertEq(token.name(), "BestToken");
        assertEq(token.symbol(), "BTK");
        assertEq(token.decimals(), 8);
        assertEq(token.totalSupply(), PRE_MINT);
        assertEq(token.balanceOf(owner), PRE_MINT);
        assertTrue(token.htsToken() != address(0));
        // HTS supply tracked in the real emulator mirrors the ERC20 supply.
        assertEq(HtsIERC20(token.htsToken()).totalSupply(), PRE_MINT);
    }

    function test_mint_syncs_to_hts() public {
        vm.prank(owner);
        token.grantMintAndBurnRoles(pool);

        vm.prank(pool);
        token.mint(alice, 50e8);

        assertEq(token.balanceOf(alice), 50e8);
        assertEq(token.totalSupply(), PRE_MINT + 50e8);
        assertEq(HtsIERC20(token.htsToken()).totalSupply(), PRE_MINT + 50e8);
    }

    function test_burn_syncs_to_hts() public {
        HtsBurnerHarness burner = new HtsBurnerHarness();

        vm.prank(owner);
        token.grantMintAndBurnRoles(address(burner));

        vm.prank(owner);
        HtsIERC20(token.htsToken()).approve(address(token), 30e8);

        vm.prank(owner);
        assertTrue(token.transfer(address(burner), 30e8));

        burner.approveAndBurn(token, 30e8);

        assertEq(token.balanceOf(address(burner)), 0);
        assertEq(token.totalSupply(), PRE_MINT - 30e8);
        assertEq(HtsIERC20(token.htsToken()).totalSupply(), PRE_MINT - 30e8);
    }

    function test_burnFrom_with_hts_allowance() public {
        vm.prank(owner);
        token.grantMintAndBurnRoles(pool);

        vm.prank(owner);
        HtsIERC20(token.htsToken()).approve(address(token), 40e8);

        vm.prank(pool);
        token.burnFrom(owner, 40e8);

        assertEq(token.balanceOf(owner), PRE_MINT - 40e8);
        assertEq(token.totalSupply(), PRE_MINT - 40e8);
        assertEq(HtsIERC20(token.htsToken()).totalSupply(), PRE_MINT - 40e8);
    }

    function test_mint_without_role_reverts() public {
        vm.prank(alice);
        vm.expectRevert();
        token.mint(alice, 1e8);
    }

    function test_getCCIPAdmin_defaults_to_deployer() public view {
        assertEq(token.getCCIPAdmin(), owner);
    }

    function test_setCCIPAdmin_updates_admin() public {
        vm.prank(owner);
        token.setCCIPAdmin(alice);
        assertEq(token.getCCIPAdmin(), alice);
    }

    function test_amount_above_int64_reverts() public {
        vm.prank(owner);
        token.grantMintAndBurnRoles(pool);

        uint256 tooLarge = uint256(uint64(type(int64).max)) + 1;

        vm.prank(pool);
        vm.expectRevert(abi.encodeWithSelector(HTSBurnMintERC20.AmountExceedsInt64.selector, tooLarge));
        token.mint(alice, tooLarge);
    }

    function test_pool_can_associate_and_approve_wrapper() public {
        address[] memory allowlist = new address[](0);
        address predictedPool = vm.computeCreateAddress(owner, vm.getNonce(owner));

        _markLocalHederaAccount(predictedPool);

        vm.prank(owner);
        HtsBurnMintTokenPool htsPool = new HtsBurnMintTokenPool(token, token.decimals(), allowlist, rmnProxy, router);
        htsPool.initializeHtsPool();

        assertEq(htsPool.htsNativeToken(), token.htsToken());
        assertEq(
            HtsIERC20(token.htsToken()).allowance(address(htsPool), address(token)), uint256(uint64(type(int64).max))
        );
    }

    function _markLocalHederaAccount(address account) internal {
        bytes32 accountSlot = bytes32(abi.encodePacked(bytes4(keccak256("getAccountId(address)")), uint64(0), account));
        bytes32 accountValue = bytes32((uint256(1) << 248) | uint256(uint32(uint160(account))));
        address scratch = address(bytes20(keccak256(abi.encode(HTS_PRECOMPILE))));

        vm.store(HTS_PRECOMPILE, accountSlot, accountValue);
        vm.store(scratch, accountSlot, bytes32(uint256(1)));
    }
}
