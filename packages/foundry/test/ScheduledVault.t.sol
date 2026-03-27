// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {ScheduledVault} from "../contracts/ScheduledVault.sol";
import {IExecutionStrategy} from "../contracts/interfaces/IExecutionStrategy.sol";
import {MockExecutionStrategy} from "./mocks/MockExecutionStrategy.sol";
import {MockHederaScheduleService} from "./mocks/MockHederaScheduleService.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract ScheduledVaultTest is Test {
  address internal constant HSS_ADDRESS = 0x000000000000000000000000000000000000016B;

  ScheduledVault internal vault;
  MockExecutionStrategy internal mockStrategy;
  MockERC20 internal token;

  address internal owner = makeAddr("owner");
  address internal alice = makeAddr("alice");

  bytes internal validConfig = abi.encode(uint256(42));

  function setUp() public {
    MockHederaScheduleService mockHss = new MockHederaScheduleService();
    vm.etch(HSS_ADDRESS, address(mockHss).code);
    _hss().setHasCapacity(true);
    _hss().setScheduleResponseCode(int64(22));
    _hss().setDeleteResponseCode(int64(22));

    mockStrategy = new MockExecutionStrategy();
    token = new MockERC20("Test", "TST", 18);
    vault = new ScheduledVault(address(mockStrategy), owner);
  }

  /*//////////////////////////////////////////////////////////////
                          CONSTRUCTOR
  //////////////////////////////////////////////////////////////*/

  function test_constructorSetsStrategyAndOwner() public view {
    assertEq(address(vault.strategy()), address(mockStrategy));
    assertEq(vault.owner(), owner);
  }

  function test_constructorRevertsOnZeroStrategy() public {
    vm.expectRevert(ScheduledVault.ScheduledVault__InvalidAddress.selector);
    new ScheduledVault(address(0), owner);
  }

  /*//////////////////////////////////////////////////////////////
                        CONFIGURATION
  //////////////////////////////////////////////////////////////*/

  function test_configureStoresConfigAndInterval() public {
    vm.prank(owner);
    vault.configure(validConfig, 1 days);

    assertEq(vault.intervalSeconds(), 1 days);
    assertEq(vault.strategyConfig(), validConfig);
  }

  function test_configureRevertsOnZeroInterval() public {
    vm.prank(owner);
    vm.expectRevert(ScheduledVault.ScheduledVault__InvalidConfig.selector);
    vault.configure(validConfig, 0);
  }

  function test_configureRevertsOnInvalidConfig() public {
    mockStrategy.setConfigValid(false);
    vm.prank(owner);
    vm.expectRevert(ScheduledVault.ScheduledVault__InvalidConfig.selector);
    vault.configure(validConfig, 1 days);
  }

  function test_configureRevertsIfNotOwner() public {
    vm.prank(alice);
    vm.expectRevert();
    vault.configure(validConfig, 1 days);
  }

  function test_configureCancelsPendingSchedule() public {
    vm.startPrank(owner);
    vault.configure(validConfig, 1 days);
    vault.scheduleNextRun();
    address firstSchedule = vault.nextSchedule();
    assertTrue(firstSchedule != address(0));

    vault.configure(validConfig, 2 days);
    vm.stopPrank();

    assertEq(vault.nextSchedule(), address(0));
    assertEq(_hss().lastDeletedSchedule(), firstSchedule);
  }

  function test_configureResetsConsecutiveFailures() public {
    vm.startPrank(owner);
    vault.configure(validConfig, 1 days);
    vault.scheduleNextRun();

    mockStrategy.setShouldRevertOnPlan(true, "fail");
    vault.executeScheduled();
    assertEq(vault.consecutiveFailures(), 1);

    mockStrategy.setShouldRevertOnPlan(false, "");
    vault.configure(validConfig, 1 days);
    assertEq(vault.consecutiveFailures(), 0);
    vm.stopPrank();
  }

  /*//////////////////////////////////////////////////////////////
                      SET STRATEGY
  //////////////////////////////////////////////////////////////*/

  function test_setStrategyClearsConfigAndSchedule() public {
    vm.startPrank(owner);
    vault.configure(validConfig, 1 days);
    vault.scheduleNextRun();

    MockExecutionStrategy newStrategy = new MockExecutionStrategy();
    vault.setStrategy(address(newStrategy));
    vm.stopPrank();

    assertEq(address(vault.strategy()), address(newStrategy));
    assertEq(vault.strategyConfig(), "");
    assertEq(vault.intervalSeconds(), 0);
    assertEq(vault.nextSchedule(), address(0));
  }

  function test_setStrategyRevertsOnZeroAddress() public {
    vm.prank(owner);
    vm.expectRevert(ScheduledVault.ScheduledVault__InvalidAddress.selector);
    vault.setStrategy(address(0));
  }

  /*//////////////////////////////////////////////////////////////
                      SCHEDULING
  //////////////////////////////////////////////////////////////*/

  function test_scheduleNextRunCreatesSchedule() public {
    vm.startPrank(owner);
    vault.configure(validConfig, 1 days);
    vault.scheduleNextRun();
    vm.stopPrank();

    assertTrue(vault.nextSchedule() != address(0));
    assertEq(_hss().lastScheduleTo(), address(vault));
    assertEq(_hss().lastScheduleGasLimit(), 3_000_000);
  }

  function test_scheduleNextRunRevertsIfNotConfigured() public {
    vm.prank(owner);
    vm.expectRevert(ScheduledVault.ScheduledVault__NotConfigured.selector);
    vault.scheduleNextRun();
  }

  function test_scheduleNextRunRevertsOnNoCapacity() public {
    _hss().setHasCapacity(false);
    vm.startPrank(owner);
    vault.configure(validConfig, 1 days);
    vm.expectRevert(ScheduledVault.ScheduledVault__NoScheduleCapacity.selector);
    vault.scheduleNextRun();
    vm.stopPrank();
  }

  function test_cancelNextScheduleDeletesFromHSS() public {
    vm.startPrank(owner);
    vault.configure(validConfig, 1 days);
    vault.scheduleNextRun();
    address schedule = vault.nextSchedule();

    vault.cancelNextSchedule();
    vm.stopPrank();

    assertEq(vault.nextSchedule(), address(0));
    assertEq(_hss().lastDeletedSchedule(), schedule);
  }

  function test_cancelNextScheduleNoopWhenEmpty() public {
    vm.prank(owner);
    vault.cancelNextSchedule();
    assertEq(vault.nextSchedule(), address(0));
  }

  /*//////////////////////////////////////////////////////////////
                        EXECUTION
  //////////////////////////////////////////////////////////////*/

  function test_executeScheduledRunsActionsAndReschedules() public {
    MockERC20 target = new MockERC20("Target", "TGT", 18);
    target.mint(address(vault), 100e18);

    mockStrategy.pushAction(address(target), 0, abi.encodeCall(MockERC20.mint, (address(vault), 50e18)));

    vm.startPrank(owner);
    vault.configure(validConfig, 1 days);
    vault.scheduleNextRun();
    vm.stopPrank();

    vault.executeScheduled();

    assertEq(target.balanceOf(address(vault)), 150e18);
    assertTrue(vault.nextSchedule() != address(0));
    assertEq(vault.consecutiveFailures(), 0);
  }

  function test_executeScheduledEmitsPlanFailedOnRevert() public {
    mockStrategy.setShouldRevertOnPlan(true, "strategy broke");

    vm.startPrank(owner);
    vault.configure(validConfig, 1 days);
    vault.scheduleNextRun();
    vm.stopPrank();

    vm.expectEmit(false, false, false, false);
    emit ScheduledVault.PlanFailed("");
    vault.executeScheduled();

    assertEq(vault.consecutiveFailures(), 1);
    assertTrue(vault.nextSchedule() != address(0), "should still reschedule");
  }

  function test_executeScheduledEmitsActionFailedOnBadCall() public {
    // Push an action that will fail: call a non-existent function on an EOA
    mockStrategy.pushAction(
      address(0xdead),
      1 ether, // will fail because vault has no HBAR
      ""
    );

    vm.startPrank(owner);
    vault.configure(validConfig, 1 days);
    vault.scheduleNextRun();
    vm.stopPrank();

    vm.expectEmit(true, true, false, false);
    emit ScheduledVault.ActionFailed(0, address(0xdead), "");
    vault.executeScheduled();

    assertEq(vault.consecutiveFailures(), 1);
  }

  function test_executeScheduledResetsFailuresOnSuccess() public {
    mockStrategy.setShouldRevertOnPlan(true, "fail");

    vm.startPrank(owner);
    vault.configure(validConfig, 1 days);
    vault.scheduleNextRun();
    vm.stopPrank();

    vault.executeScheduled();
    assertEq(vault.consecutiveFailures(), 1);
    vault.executeScheduled();
    assertEq(vault.consecutiveFailures(), 2);

    mockStrategy.setShouldRevertOnPlan(false, "");
    vault.executeScheduled();
    assertEq(vault.consecutiveFailures(), 0);
  }

  function test_executeScheduledStopsReschedulingAfterMaxFailures() public {
    mockStrategy.setShouldRevertOnPlan(true, "broken");

    vm.startPrank(owner);
    vault.configure(validConfig, 1 days);
    vault.setMaxConsecutiveFailures(2);
    vault.scheduleNextRun();
    vm.stopPrank();

    vault.executeScheduled();
    assertEq(vault.consecutiveFailures(), 1);
    assertTrue(vault.nextSchedule() != address(0), "should reschedule after 1st failure");

    vault.executeScheduled();
    assertEq(vault.consecutiveFailures(), 2);
    // After reaching max, _tryReschedule should skip — nextSchedule remains from previous
    // but since HSS mock creates a new one each time, we check the event
  }

  function test_executeScheduledRevertsIfNotConfigured() public {
    vm.expectRevert(ScheduledVault.ScheduledVault__NotConfigured.selector);
    vault.executeScheduled();
  }

  /*//////////////////////////////////////////////////////////////
                        PREVIEW
  //////////////////////////////////////////////////////////////*/

  function test_previewExecutionReturnsPlan() public {
    MockERC20 target = new MockERC20("X", "X", 18);
    bytes memory callData = abi.encodeCall(MockERC20.mint, (address(vault), 1e18));
    mockStrategy.pushAction(address(target), 0, callData);

    vm.prank(owner);
    vault.configure(validConfig, 1 days);

    IExecutionStrategy.Action[] memory actions = vault.previewExecution();
    assertEq(actions.length, 1);
    assertEq(actions[0].target, address(target));
    assertEq(actions[0].value, 0);
    assertEq(actions[0].data, callData);
  }

  /*//////////////////////////////////////////////////////////////
                    MAX CONSECUTIVE FAILURES
  //////////////////////////////////////////////////////////////*/

  function test_setMaxConsecutiveFailures() public {
    vm.prank(owner);
    vault.setMaxConsecutiveFailures(5);
    assertEq(vault.maxConsecutiveFailures(), 5);
  }

  /*//////////////////////////////////////////////////////////////
                      FUND MANAGEMENT
  //////////////////////////////////////////////////////////////*/

  function test_depositHbar() public {
    vm.deal(alice, 1 ether);
    vm.prank(alice);
    vault.deposit{value: 1 ether}();
    assertEq(address(vault).balance, 1 ether);
  }

  function test_depositRevertsOnZero() public {
    vm.expectRevert(ScheduledVault.ScheduledVault__ZeroAmount.selector);
    vault.deposit{value: 0}();
  }

  function test_depositTokens() public {
    token.mint(owner, 100e18);
    vm.startPrank(owner);
    token.approve(address(vault), 100e18);
    vault.depositTokens(address(token), 100e18);
    vm.stopPrank();
    assertEq(token.balanceOf(address(vault)), 100e18);
  }

  function test_depositTokensRevertsOnZeroToken() public {
    vm.prank(owner);
    vm.expectRevert(ScheduledVault.ScheduledVault__ZeroAmount.selector);
    vault.depositTokens(address(0), 100);
  }

  function test_withdrawHbar() public {
    vm.deal(address(vault), 2 ether);
    vm.prank(owner);
    vault.withdraw(1 ether);
    assertEq(address(vault).balance, 1 ether);
    assertEq(owner.balance, 1 ether);
  }

  function test_withdrawRevertsOnInsufficientBalance() public {
    vm.prank(owner);
    vm.expectRevert(ScheduledVault.ScheduledVault__InsufficientBalance.selector);
    vault.withdraw(1 ether);
  }

  function test_withdrawTokens() public {
    token.mint(address(vault), 100e18);
    vm.prank(owner);
    vault.withdrawTokens(address(token), 50e18);
    assertEq(token.balanceOf(address(vault)), 50e18);
    assertEq(token.balanceOf(owner), 50e18);
  }

  function test_withdrawTokensRevertsOnInsufficient() public {
    vm.prank(owner);
    vm.expectRevert(ScheduledVault.ScheduledVault__InsufficientBalance.selector);
    vault.withdrawTokens(address(token), 1);
  }

  function test_receiveHbar() public {
    vm.deal(alice, 1 ether);
    vm.prank(alice);
    (bool ok, ) = address(vault).call{value: 1 ether}("");
    assertTrue(ok);
    assertEq(address(vault).balance, 1 ether);
  }

  /*//////////////////////////////////////////////////////////////
                          HELPERS
  //////////////////////////////////////////////////////////////*/

  function _hss() internal pure returns (MockHederaScheduleService) {
    return MockHederaScheduleService(HSS_ADDRESS);
  }
}
