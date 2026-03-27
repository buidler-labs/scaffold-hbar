// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import {IExecutionStrategy} from "./interfaces/IExecutionStrategy.sol";
import {IHederaScheduleService} from "./interfaces/IHederaScheduleService.sol";
import {HederaResponseCodes} from "hedera-forking/HederaResponseCodes.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ScheduledVault
 * @notice Generic vault that schedules recurring on-chain actions via Hedera Schedule Service.
 *         The *what-to-do* is delegated to a pluggable IExecutionStrategy; the vault handles
 *         fund custody, HSS scheduling, and auto-rescheduling.
 * @dev Flow: deposit -> configure(strategy config) -> scheduleNextRun -> HSS fires executeScheduled -> repeat
 */
contract ScheduledVault is ReentrancyGuard, Ownable {
  error ScheduledVault__InvalidAddress();
  error ScheduledVault__ZeroAmount();
  error ScheduledVault__InvalidConfig();
  error ScheduledVault__NotConfigured();
  error ScheduledVault__InsufficientBalance();
  error ScheduledVault__TransferFailed();
  error ScheduledVault__ScheduleFailed();
  error ScheduledVault__NoScheduleCapacity();

  IHederaScheduleService internal constant HSS = IHederaScheduleService(0x000000000000000000000000000000000000016B);
  uint256 internal constant SCHEDULE_GAS_LIMIT = 3_000_000;
  int64 internal constant HSS_SUCCESS = int64(int32(HederaResponseCodes.SUCCESS));
  address internal constant ZERO_ADDRESS = address(0);
  uint256 internal constant ZERO_AMOUNT = 0;

  IExecutionStrategy public strategy;
  bytes public strategyConfig;
  uint256 public intervalSeconds;
  address public nextSchedule;
  uint256 public consecutiveFailures;
  uint256 public maxConsecutiveFailures;

  event Deposited(address indexed user, uint256 amount);
  event TokensDeposited(address indexed user, address indexed token, uint256 amount);
  event Configured(uint256 intervalSeconds);
  event StrategySet(address indexed strategy);
  event Withdrawn(address indexed user, uint256 amount);
  event TokensWithdrawn(address indexed user, address indexed token, uint256 amount);
  event ScheduleCreated(address indexed schedule, uint256 executeAt);
  event ScheduleRescheduleFailed(int64 responseCode);
  event ExecutionSucceeded();
  event PlanFailed(bytes reason);
  event ActionFailed(uint256 index, address target, bytes reason);
  event MaxFailuresReached(uint256 failures);

  constructor(address _strategy, address _owner) Ownable(_owner) {
    if (_strategy == ZERO_ADDRESS) revert ScheduledVault__InvalidAddress();
    strategy = IExecutionStrategy(_strategy);
  }

  /*//////////////////////////////////////////////////////////////
                        CONFIGURATIONS
  //////////////////////////////////////////////////////////////*/

  /// @notice Set or update the execution strategy. Cancels any pending schedule.
  function setStrategy(address _strategy) external onlyOwner {
    if (_strategy == ZERO_ADDRESS) revert ScheduledVault__InvalidAddress();
    _cancelPendingSchedule();
    strategy = IExecutionStrategy(_strategy);
    delete strategyConfig;
    delete intervalSeconds;
    consecutiveFailures = ZERO_AMOUNT;
    emit StrategySet(_strategy);
  }

  /// @notice Configure the strategy and scheduling interval. Cancels any pending schedule.
  /// @param config ABI-encoded strategy-specific configuration
  /// @param interval Seconds between each scheduled execution
  function configure(bytes calldata config, uint256 interval) external onlyOwner {
    if (interval == ZERO_AMOUNT) revert ScheduledVault__InvalidConfig();
    if (!strategy.validateConfig(config)) revert ScheduledVault__InvalidConfig();
    _cancelPendingSchedule();
    strategyConfig = config;
    intervalSeconds = interval;
    consecutiveFailures = ZERO_AMOUNT;
    emit Configured(interval);
  }

  /// @notice Set the maximum consecutive failures before auto-rescheduling stops. 0 = unlimited.
  function setMaxConsecutiveFailures(uint256 max) external onlyOwner {
    maxConsecutiveFailures = max;
  }

  /// @notice Create the first (or next manual) HSS schedule.
  function scheduleNextRun() external onlyOwner nonReentrant {
    _schedule();
  }

  /// @notice Cancel the pending HSS schedule.
  function cancelNextSchedule() external onlyOwner {
    address schedule = nextSchedule;
    if (schedule == ZERO_ADDRESS) return;
    nextSchedule = ZERO_ADDRESS;
    int64 rc = HSS.deleteSchedule(schedule);
    if (rc != HSS_SUCCESS) revert ScheduledVault__ScheduleFailed();
  }

  /*//////////////////////////////////////////////////////////////
                      HSS-TRIGGERED EXECUTION
  //////////////////////////////////////////////////////////////*/

  /// @notice Called by HSS at the scheduled time. Executes the strategy plan, then auto-reschedules.
  function executeScheduled() external nonReentrant {
    if (strategyConfig.length == ZERO_AMOUNT) revert ScheduledVault__NotConfigured();

    bool success;
    try strategy.plan(strategyConfig) returns (IExecutionStrategy.Action[] memory actions) {
      bool allOk = true;
      for (uint256 i = 0; i < actions.length; i++) {
        (bool ok, bytes memory returnData) = actions[i].target.call{value: actions[i].value}(actions[i].data);
        if (!ok) {
          emit ActionFailed(i, actions[i].target, returnData);
          allOk = false;
          break;
        }
      }
      if (allOk) {
        success = true;
        emit ExecutionSucceeded();
      }
    } catch (bytes memory reason) {
      emit PlanFailed(reason);
    }

    if (success) {
      consecutiveFailures = ZERO_AMOUNT;
    } else {
      consecutiveFailures++;
    }

    _tryReschedule();
  }

  /// @notice Dry-run the strategy plan. Call from Hashscan / ethers.js to debug before execution.
  function previewExecution() external view returns (IExecutionStrategy.Action[] memory) {
    return strategy.plan(strategyConfig);
  }

  /*//////////////////////////////////////////////////////////////
                        FUND MANAGEMENT
  //////////////////////////////////////////////////////////////*/

  /// @notice Deposit HBAR into the vault. Anyone can fund.
  function deposit() external payable {
    if (msg.value == ZERO_AMOUNT) revert ScheduledVault__ZeroAmount();
    emit Deposited(msg.sender, msg.value);
  }

  /// @notice Deposit ERC20/HTS tokens into the vault.
  function depositTokens(address token, uint256 amount) external onlyOwner nonReentrant {
    if (token == ZERO_ADDRESS || amount == ZERO_AMOUNT) revert ScheduledVault__ZeroAmount();
    if (!IERC20(token).transferFrom(msg.sender, address(this), amount)) revert ScheduledVault__TransferFailed();
    emit TokensDeposited(msg.sender, token, amount);
  }

  /// @notice Withdraw HBAR to the owner.
  function withdraw(uint256 amount) external onlyOwner nonReentrant {
    if (amount > address(this).balance) revert ScheduledVault__InsufficientBalance();
    address ownerAddr = owner();
    (bool ok, ) = ownerAddr.call{value: amount}("");
    if (!ok) revert ScheduledVault__TransferFailed();
    emit Withdrawn(ownerAddr, amount);
  }

  /// @notice Withdraw ERC20/HTS tokens to the owner.
  function withdrawTokens(address token, uint256 amount) external onlyOwner nonReentrant {
    if (token == ZERO_ADDRESS || amount == ZERO_AMOUNT) revert ScheduledVault__ZeroAmount();
    if (IERC20(token).balanceOf(address(this)) < amount) revert ScheduledVault__InsufficientBalance();
    address ownerAddr = owner();
    if (!IERC20(token).transfer(ownerAddr, amount)) revert ScheduledVault__TransferFailed();
    emit TokensWithdrawn(ownerAddr, token, amount);
  }

  /*//////////////////////////////////////////////////////////////
                      HEDERA SCHEDULE SERVICE
  //////////////////////////////////////////////////////////////*/

  function _schedule() internal {
    if (strategyConfig.length == ZERO_AMOUNT) revert ScheduledVault__NotConfigured();

    uint256 expirySecond = block.timestamp + intervalSeconds;
    if (!HSS.hasScheduleCapacity(expirySecond, SCHEDULE_GAS_LIMIT)) {
      revert ScheduledVault__NoScheduleCapacity();
    }

    bytes memory callData = abi.encodeCall(this.executeScheduled, ());
    (int64 rc, address scheduleAddr) = HSS.scheduleCall(
      address(this),
      expirySecond,
      SCHEDULE_GAS_LIMIT,
      uint64(ZERO_AMOUNT),
      callData
    );

    if (rc != HSS_SUCCESS || scheduleAddr == ZERO_ADDRESS) {
      revert ScheduledVault__ScheduleFailed();
    }

    nextSchedule = scheduleAddr;
    emit ScheduleCreated(scheduleAddr, expirySecond);
  }

  function _tryReschedule() internal {
    if (maxConsecutiveFailures > ZERO_AMOUNT && consecutiveFailures >= maxConsecutiveFailures) {
      emit MaxFailuresReached(consecutiveFailures);
      return;
    }

    uint256 nextExpiry = block.timestamp + intervalSeconds;
    if (!HSS.hasScheduleCapacity(nextExpiry, SCHEDULE_GAS_LIMIT)) {
      emit ScheduleRescheduleFailed(-1);
      return;
    }

    bytes memory callData = abi.encodeCall(this.executeScheduled, ());
    (int64 rc, address scheduleAddr) = HSS.scheduleCall(
      address(this),
      nextExpiry,
      SCHEDULE_GAS_LIMIT,
      uint64(ZERO_AMOUNT),
      callData
    );

    if (rc == HSS_SUCCESS && scheduleAddr != ZERO_ADDRESS) {
      nextSchedule = scheduleAddr;
      emit ScheduleCreated(scheduleAddr, nextExpiry);
    } else {
      emit ScheduleRescheduleFailed(rc);
    }
  }

  function _cancelPendingSchedule() internal {
    if (nextSchedule != ZERO_ADDRESS) {
      HSS.deleteSchedule(nextSchedule);
      nextSchedule = ZERO_ADDRESS;
    }
  }

  receive() external payable {}
}
