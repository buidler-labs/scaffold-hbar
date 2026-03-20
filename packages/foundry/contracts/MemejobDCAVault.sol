// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import {IMemeJob} from "./interfaces/IMemejob.sol";
import {IHederaScheduleService} from "./interfaces/IHederaScheduleService.sol";
import {HederaResponseCodes} from "hedera-forking/HederaResponseCodes.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MemejobDCAVault
 * @notice DCA into/out of MemeJob tokens via Hedera Schedule Service (HIP-1215)
 * @dev Flow: deposit -> configureDCA -> scheduleNextRun -> HSS executes runDCA -> repeat
 *      Vault must be associated with memeToken on Hedera before first buy.
 *      BUY: spends HBAR to buy tokens. SELL: sells tokens for HBAR.
 */
contract MemejobDCAVault is ReentrancyGuard, Ownable {
  error MemejobDCAVault__InvalidConfig();
  error MemejobDCAVault__ZeroAmount();
  error MemejobDCAVault__SlippageExceeded();
  error MemejobDCAVault__InsufficientBalance();
  error MemejobDCAVault__TokenNotConfigured();
  error MemejobDCAVault__TransferFailed();
  error MemejobDCAVault__ScheduleFailed();
  error MemejobDCAVault__NoScheduleCapacity();

  enum DCAMode {
    Buy,
    Sell
  }

  /// @notice Persistent configuration for the DCA strategy.
  struct DCAConfig {
    /// @dev EVM address of the target HTS meme token (8 decimals)
    address memeToken;
    /// @dev Buy = spend HBAR to acquire tokens, Sell = sell tokens for HBAR
    DCAMode mode;
    /// @dev Token amount per execution (in token's smallest unit)
    uint256 amountPerRun;
    /// @dev Minimum seconds between consecutive DCA runs
    uint256 intervalSeconds;
  }

  IHederaScheduleService internal constant HSS = IHederaScheduleService(0x000000000000000000000000000000000000016B);
  uint256 internal constant SCHEDULE_GAS_LIMIT = 3_000_000;
  int64 internal constant HSS_SUCCESS = int64(int32(HederaResponseCodes.SUCCESS));
  address internal constant ZERO_ADDRESS = address(0);
  uint256 internal constant ZERO_AMOUNT = 0;

  IMemeJob public immutable memejob;
  DCAConfig public dcaConfig;
  address public nextSchedule;

  event Deposited(address indexed user, uint256 amount);
  event TokensDeposited(address indexed user, address indexed token, uint256 amount);
  event DCAConfigured(address indexed memeToken, DCAMode mode, uint256 amountPerRun, uint256 intervalSeconds);
  event BuyExecuted(address indexed memeToken, uint256 tokenAmount, uint256 hbarSpent);
  event SellExecuted(address indexed memeToken, uint256 tokenAmount, uint256 hbarReceived);
  event Withdrawn(address indexed user, uint256 amount);
  event TokensWithdrawn(address indexed user, address indexed token, uint256 amount);
  event ScheduleCreated(address indexed schedule, uint256 executeAt);
  event ScheduleFailed(int64 responseCode);

  constructor(address _memejob, address _owner) Ownable(_owner) {
    if (_memejob == ZERO_ADDRESS) revert MemejobDCAVault__InvalidConfig();
    memejob = IMemeJob(_memejob);
  }

  /// @notice Deposit HBAR into the vault for BUY DCA. Anyone can fund the vault.
  function deposit() external payable {
    if (msg.value == ZERO_AMOUNT) revert MemejobDCAVault__ZeroAmount();
    emit Deposited(msg.sender, msg.value);
  }

  /// @notice Deposit meme tokens into the vault for SELL DCA.
  /// @dev Vault must be associated with the token on Hedera before calling.
  /// @param token EVM address of the HTS token to deposit
  /// @param amount Amount of tokens to transfer in (smallest unit, 8 decimals for meme tokens)
  function depositTokens(address token, uint256 amount) external onlyOwner nonReentrant {
    if (token == ZERO_ADDRESS || amount == ZERO_AMOUNT) revert MemejobDCAVault__ZeroAmount();
    if (!IERC20(token).transferFrom(msg.sender, address(this), amount)) revert MemejobDCAVault__TransferFailed();
    emit TokensDeposited(msg.sender, token, amount);
  }

  /// @notice Set or update the DCA strategy. Auto-cancels any pending schedule.
  /// @param memeToken EVM address of the target meme token
  /// @param mode Buy (spend HBAR for tokens) or Sell (sell tokens for HBAR)
  /// @param amountPerRun Token amount per DCA execution (smallest unit)
  /// @param intervalSeconds Seconds between each DCA run
  function configureDCA(
    address memeToken,
    DCAMode mode,
    uint256 amountPerRun,
    uint256 intervalSeconds
  ) external onlyOwner {
    if (memeToken == ZERO_ADDRESS || amountPerRun == ZERO_AMOUNT || intervalSeconds == ZERO_AMOUNT) {
      revert MemejobDCAVault__InvalidConfig();
    }

    if (nextSchedule != ZERO_ADDRESS) {
      HSS.deleteSchedule(nextSchedule);
      nextSchedule = ZERO_ADDRESS;
    }

    dcaConfig = DCAConfig({
      memeToken: memeToken,
      mode: mode,
      amountPerRun: amountPerRun,
      intervalSeconds: intervalSeconds
    });
    emit DCAConfigured(memeToken, mode, amountPerRun, intervalSeconds);
  }

  /// @notice Create the first (or next manual) HSS schedule to kick off the DCA chain.
  /// @param maxHbarIn For BUY: max HBAR per run (slippage guard). Pass 0 to skip. Ignored for SELL.
  function scheduleNextRun(uint256 maxHbarIn) external onlyOwner nonReentrant {
    uint256 effectiveMax = maxHbarIn == ZERO_AMOUNT ? type(uint256).max : maxHbarIn;
    _schedule(effectiveMax);
  }

  /**
   * @notice Executed by HSS at the scheduled time. Runs BUY or SELL, then auto-reschedules.
   * @dev Callable by vault owner (manual) or any HSS schedule created by this vault.
   * @param maxHbarIn For BUY: max HBAR to spend (type(uint256).max to skip slippage). Ignored for SELL.
   */
  function runDCA(uint256 maxHbarIn) external nonReentrant {
    DCAConfig memory config = dcaConfig;
    if (config.memeToken == ZERO_ADDRESS) revert MemejobDCAVault__TokenNotConfigured();

    if (config.mode == DCAMode.Buy) {
      _executeBuy(config, maxHbarIn);
    } else {
      _executeSell(config);
    }

    _tryReschedule(config.intervalSeconds, maxHbarIn);
  }

  /// @notice Cancel the pending HSS schedule. Reverts if HSS deletion fails.
  function cancelNextSchedule() external onlyOwner {
    address schedule = nextSchedule;
    if (schedule == ZERO_ADDRESS) return;
    nextSchedule = ZERO_ADDRESS;
    int64 rc = HSS.deleteSchedule(schedule);
    if (rc != HSS_SUCCESS) revert MemejobDCAVault__ScheduleFailed();
  }

  /// @notice Withdraw HBAR from the vault to the owner.
  /// @param amount Amount of HBAR (in wei/tinybar) to withdraw
  function withdraw(uint256 amount) external onlyOwner nonReentrant {
    if (amount > address(this).balance) revert MemejobDCAVault__InsufficientBalance();
    address ownerAddr = owner();
    (bool ok, ) = ownerAddr.call{value: amount}("");
    if (!ok) revert MemejobDCAVault__TransferFailed();
    emit Withdrawn(ownerAddr, amount);
  }

  /// @notice Withdraw ERC20/HTS tokens from the vault to the owner.
  /// @param token EVM address of the token to withdraw
  /// @param amount Amount of tokens to withdraw
  function withdrawTokens(address token, uint256 amount) external onlyOwner nonReentrant {
    if (token == ZERO_ADDRESS || amount == ZERO_AMOUNT) revert MemejobDCAVault__ZeroAmount();
    if (IERC20(token).balanceOf(address(this)) < amount) revert MemejobDCAVault__InsufficientBalance();
    address ownerAddr = owner();
    if (!IERC20(token).transfer(ownerAddr, amount)) revert MemejobDCAVault__TransferFailed();
    emit TokensWithdrawn(ownerAddr, token, amount);
  }

  /*//////////////////////////////////////////////////////////////
                            HELPER FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  /// @notice Estimate HBAR cost to buy a given token amount at current bonding curve price.
  /// @param amount Token amount (smallest unit) to quote
  /// @return HBAR cost in tinybar
  function getBuyCost(uint256 amount) external view returns (uint256) {
    if (dcaConfig.memeToken == ZERO_ADDRESS) return ZERO_AMOUNT;
    return memejob.getAmountOut(dcaConfig.memeToken, amount, IMemeJob.TransactionType.BuyInTokens);
  }

  /// @notice Estimate HBAR return for selling a given token amount at current bonding curve price.
  /// @param amount Token amount (smallest unit) to quote
  /// @return HBAR return in tinybar
  function getSellReturn(uint256 amount) external view returns (uint256) {
    if (dcaConfig.memeToken == ZERO_ADDRESS) return ZERO_AMOUNT;
    return memejob.getAmountOut(dcaConfig.memeToken, amount, IMemeJob.TransactionType.SellInTokens);
  }

  /*//////////////////////////////////////////////////////////////
                        HEDERA SCHEDULE SERVICE
  //////////////////////////////////////////////////////////////*/

  function _schedule(uint256 maxHbarIn) internal {
    DCAConfig memory config = dcaConfig;
    if (config.memeToken == ZERO_ADDRESS) revert MemejobDCAVault__TokenNotConfigured();

    uint256 expirySecond = block.timestamp + config.intervalSeconds;
    if (!HSS.hasScheduleCapacity(expirySecond, SCHEDULE_GAS_LIMIT)) {
      revert MemejobDCAVault__NoScheduleCapacity();
    }

    bytes memory callData = abi.encodeCall(this.runDCA, (maxHbarIn));
    (int64 rc, address scheduleAddr) = HSS.scheduleCall(address(this), expirySecond, SCHEDULE_GAS_LIMIT, 0, callData);

    if (rc != HSS_SUCCESS || scheduleAddr == ZERO_ADDRESS) {
      revert MemejobDCAVault__ScheduleFailed();
    }

    nextSchedule = scheduleAddr;
    emit ScheduleCreated(scheduleAddr, expirySecond);
  }

  /// @dev Best-effort reschedule after a successful trade. Never reverts so the trade is not lost.
  function _tryReschedule(uint256 intervalSeconds, uint256 maxHbarIn) internal {
    uint256 nextExpiry = block.timestamp + intervalSeconds;

    if (!HSS.hasScheduleCapacity(nextExpiry, SCHEDULE_GAS_LIMIT)) {
      emit ScheduleFailed(-1);
      return;
    }

    bytes memory callData = abi.encodeCall(this.runDCA, (maxHbarIn));
    (int64 rc, address scheduleAddr) = HSS.scheduleCall(address(this), nextExpiry, SCHEDULE_GAS_LIMIT, 0, callData);

    if (rc == HSS_SUCCESS && scheduleAddr != ZERO_ADDRESS) {
      nextSchedule = scheduleAddr;
      emit ScheduleCreated(scheduleAddr, nextExpiry);
    } else {
      emit ScheduleFailed(rc);
    }
  }

  /*//////////////////////////////////////////////////////////////
                          BUY / SELL EXECUTION
  //////////////////////////////////////////////////////////////*/
  function _executeBuy(DCAConfig memory config, uint256 maxHbarIn) internal {
    uint256 hbarRequired = memejob.getAmountOut(
      config.memeToken,
      config.amountPerRun,
      IMemeJob.TransactionType.BuyInTokens
    );
    if (hbarRequired > maxHbarIn) revert MemejobDCAVault__SlippageExceeded();
    if (address(this).balance < hbarRequired) revert MemejobDCAVault__InsufficientBalance();

    memejob.buyJob{value: hbarRequired}(config.memeToken, config.amountPerRun, ZERO_ADDRESS);
    emit BuyExecuted(config.memeToken, config.amountPerRun, hbarRequired);
  }

  function _executeSell(DCAConfig memory config) internal {
    uint256 tokenBalance = IERC20(config.memeToken).balanceOf(address(this));
    if (tokenBalance < config.amountPerRun) revert MemejobDCAVault__InsufficientBalance();

    IERC20 token = IERC20(config.memeToken);
    token.approve(address(memejob), config.amountPerRun);

    uint256 hbarBefore = address(this).balance;
    memejob.sellJob(config.memeToken, config.amountPerRun);
    uint256 hbarAfter = address(this).balance - hbarBefore;

    emit SellExecuted(config.memeToken, config.amountPerRun, hbarAfter);
  }

  /*//////////////////////////////////////////////////////////////
                          RECEIVE HBAR
  //////////////////////////////////////////////////////////////*/
  receive() external payable {}
}
