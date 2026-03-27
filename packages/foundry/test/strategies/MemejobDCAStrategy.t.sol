// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {MemejobDCAStrategy} from "../../contracts/strategies/MemejobDCAStrategy.sol";
import {IExecutionStrategy} from "../../contracts/interfaces/IExecutionStrategy.sol";
import {IMemeJob} from "../../contracts/interfaces/IMemejob.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {MockMemeJob} from "../mocks/MockMemeJob.sol";
import {MockERC20} from "../mocks/MockERC20.sol";

contract MemejobDCAStrategyTest is Test {
  uint256 internal constant ONE_TOKEN = 1e8;
  uint256 internal constant PRICE_PER_UNIT = 1e10;

  MemejobDCAStrategy internal strategy;
  MockMemeJob internal mockMemeJob;
  MockERC20 internal memeToken;

  address internal vault = makeAddr("vault");

  function setUp() public {
    strategy = new MemejobDCAStrategy();
    mockMemeJob = new MockMemeJob();
    mockMemeJob.setTokenPrice(PRICE_PER_UNIT);
    memeToken = new MockERC20("Meme", "MEME", 8);
  }

  function test_validateConfigAcceptsValidBuyConfig() public view {
    bytes memory config = _encodeBuyConfig(ONE_TOKEN, type(uint256).max);
    assertTrue(strategy.validateConfig(config));
  }

  function test_validateConfigAcceptsValidSellConfig() public view {
    bytes memory config = _encodeSellConfig(ONE_TOKEN);
    assertTrue(strategy.validateConfig(config));
  }

  function test_validateConfigRejectsZeroMemejob() public view {
    bytes memory config = abi.encode(
      MemejobDCAStrategy.DCAConfig({
        memejob: address(0),
        memeToken: address(memeToken),
        isBuy: true,
        amountPerRun: ONE_TOKEN,
        maxHbarIn: type(uint256).max
      })
    );
    assertFalse(strategy.validateConfig(config));
  }

  function test_validateConfigRejectsZeroMemeToken() public view {
    bytes memory config = abi.encode(
      MemejobDCAStrategy.DCAConfig({
        memejob: address(mockMemeJob),
        memeToken: address(0),
        isBuy: true,
        amountPerRun: ONE_TOKEN,
        maxHbarIn: type(uint256).max
      })
    );
    assertFalse(strategy.validateConfig(config));
  }

  function test_validateConfigRejectsZeroAmount() public view {
    bytes memory config = abi.encode(
      MemejobDCAStrategy.DCAConfig({
        memejob: address(mockMemeJob),
        memeToken: address(memeToken),
        isBuy: true,
        amountPerRun: 0,
        maxHbarIn: type(uint256).max
      })
    );
    assertFalse(strategy.validateConfig(config));
  }

  function test_validateConfigRejectsZeroMaxHbarForBuy() public view {
    bytes memory config = abi.encode(
      MemejobDCAStrategy.DCAConfig({
        memejob: address(mockMemeJob),
        memeToken: address(memeToken),
        isBuy: true,
        amountPerRun: ONE_TOKEN,
        maxHbarIn: 0
      })
    );
    assertFalse(strategy.validateConfig(config));
  }

  function test_validateConfigAllowsZeroMaxHbarForSell() public view {
    bytes memory config = abi.encode(
      MemejobDCAStrategy.DCAConfig({
        memejob: address(mockMemeJob),
        memeToken: address(memeToken),
        isBuy: false,
        amountPerRun: ONE_TOKEN,
        maxHbarIn: 0
      })
    );
    assertTrue(strategy.validateConfig(config));
  }

  function test_planBuyReturnsSingleAction() public {
    vm.deal(vault, 10 ether);
    bytes memory config = _encodeBuyConfig(ONE_TOKEN, type(uint256).max);

    vm.prank(vault);
    IExecutionStrategy.Action[] memory actions = strategy.plan(config);

    assertEq(actions.length, 1);
    assertEq(actions[0].target, address(mockMemeJob));
    assertEq(actions[0].value, ONE_TOKEN * PRICE_PER_UNIT);
    assertEq(actions[0].data, abi.encodeCall(IMemeJob.buyJob, (address(memeToken), ONE_TOKEN, address(0))));
  }

  function test_planBuyRevertsOnSlippage() public {
    vm.deal(vault, 10 ether);
    uint256 expectedCost = ONE_TOKEN * PRICE_PER_UNIT;
    uint256 tooLowMax = expectedCost - 1;
    bytes memory config = _encodeBuyConfig(ONE_TOKEN, tooLowMax);

    vm.prank(vault);
    vm.expectRevert(
      abi.encodeWithSelector(MemejobDCAStrategy.MemejobDCAStrategy__SlippageExceeded.selector, expectedCost, tooLowMax)
    );
    strategy.plan(config);
  }

  function test_planBuyRevertsOnInsufficientVaultBalance() public {
    // vault has 0 HBAR
    bytes memory config = _encodeBuyConfig(ONE_TOKEN, type(uint256).max);

    vm.prank(vault);
    vm.expectRevert(
      abi.encodeWithSelector(
        MemejobDCAStrategy.MemejobDCAStrategy__InsufficientVaultBalance.selector,
        ONE_TOKEN * PRICE_PER_UNIT,
        0
      )
    );
    strategy.plan(config);
  }

  function test_planSellReturnsTwoActions() public {
    memeToken.mint(vault, ONE_TOKEN);
    bytes memory config = _encodeSellConfig(ONE_TOKEN);

    vm.prank(vault);
    IExecutionStrategy.Action[] memory actions = strategy.plan(config);

    assertEq(actions.length, 2);

    // Action 0: approve
    assertEq(actions[0].target, address(memeToken));
    assertEq(actions[0].value, 0);
    assertEq(actions[0].data, abi.encodeCall(IERC20.approve, (address(mockMemeJob), ONE_TOKEN)));

    // Action 1: sellJob
    assertEq(actions[1].target, address(mockMemeJob));
    assertEq(actions[1].value, 0);
    assertEq(actions[1].data, abi.encodeCall(IMemeJob.sellJob, (address(memeToken), ONE_TOKEN)));
  }

  function test_planSellRevertsOnInsufficientTokens() public {
    bytes memory config = _encodeSellConfig(ONE_TOKEN);

    vm.prank(vault);
    vm.expectRevert(
      abi.encodeWithSelector(MemejobDCAStrategy.MemejobDCAStrategy__InsufficientVaultBalance.selector, ONE_TOKEN, 0)
    );
    strategy.plan(config);
  }

  function test_vaultCanExecuteBuyPlan() public {
    vm.deal(vault, 10 ether);
    bytes memory config = _encodeBuyConfig(ONE_TOKEN, type(uint256).max);

    vm.prank(vault);
    IExecutionStrategy.Action[] memory actions = strategy.plan(config);

    uint256 balBefore = vault.balance;
    vm.startPrank(vault);
    for (uint256 i = 0; i < actions.length; i++) {
      (bool ok, ) = actions[i].target.call{value: actions[i].value}(actions[i].data);
      assertTrue(ok, "action failed");
    }
    vm.stopPrank();

    assertEq(memeToken.balanceOf(vault), ONE_TOKEN);
    assertEq(vault.balance, balBefore - ONE_TOKEN * PRICE_PER_UNIT);
  }

  function test_vaultCanExecuteSellPlan() public {
    memeToken.mint(vault, ONE_TOKEN);
    vm.deal(address(mockMemeJob), 10 ether);
    bytes memory config = _encodeSellConfig(ONE_TOKEN);

    vm.prank(vault);
    IExecutionStrategy.Action[] memory actions = strategy.plan(config);

    uint256 hbarBefore = vault.balance;
    vm.startPrank(vault);
    for (uint256 i = 0; i < actions.length; i++) {
      (bool ok, ) = actions[i].target.call{value: actions[i].value}(actions[i].data);
      assertTrue(ok, "action failed");
    }
    vm.stopPrank();

    assertEq(memeToken.balanceOf(vault), 0);
    assertEq(vault.balance, hbarBefore + ONE_TOKEN * PRICE_PER_UNIT);
  }

  /*//////////////////////////////////////////////////////////////
                          HELPERS
  //////////////////////////////////////////////////////////////*/

  function _encodeBuyConfig(uint256 amount, uint256 maxHbar) internal view returns (bytes memory) {
    return
      abi.encode(
        MemejobDCAStrategy.DCAConfig({
          memejob: address(mockMemeJob),
          memeToken: address(memeToken),
          isBuy: true,
          amountPerRun: amount,
          maxHbarIn: maxHbar
        })
      );
  }

  function _encodeSellConfig(uint256 amount) internal view returns (bytes memory) {
    return
      abi.encode(
        MemejobDCAStrategy.DCAConfig({
          memejob: address(mockMemeJob),
          memeToken: address(memeToken),
          isBuy: false,
          amountPerRun: amount,
          maxHbarIn: 0
        })
      );
  }
}
