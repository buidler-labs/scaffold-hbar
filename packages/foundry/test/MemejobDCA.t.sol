// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {MemejobDCAVault} from "../contracts/MemejobDCAVault.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {MockMemeJob} from "./mocks/MockMemeJob.sol";
import {MockHederaScheduleService} from "./mocks/MockHederaScheduleService.sol";

contract MemejobDCATest is Test {
  address internal constant HSS_ADDRESS = 0x000000000000000000000000000000000000016B;
  uint256 internal constant ONE_TOKEN = 1e8; // MemeJob tokens use 8 decimals
  uint256 internal constant PRICE_PER_UNIT = 1e10; // 10 gwei per smallest unit → 1 HBAR per token

  MemejobDCAVault internal vault;
  MockMemeJob internal mockMemeJob;
  MockERC20 internal memeToken;

  address internal owner = makeAddr("owner");

  function setUp() public {
    MockHederaScheduleService mockHssImplementation = new MockHederaScheduleService();
    vm.etch(HSS_ADDRESS, address(mockHssImplementation).code);
    // vm.etch copies code but not storage — initialize mock state explicitly
    _hss().setHasCapacity(true);
    _hss().setScheduleResponseCode(int64(22));
    _hss().setDeleteResponseCode(int64(22));

    mockMemeJob = new MockMemeJob();
    mockMemeJob.setTokenPrice(PRICE_PER_UNIT);
    memeToken = new MockERC20("Meme", "MEME", 8);
    vault = new MemejobDCAVault(address(mockMemeJob), owner);
  }

  function test_configureDCADeletesPendingSchedule() public {
    vm.startPrank(owner);
    vault.configureDCA(address(memeToken), MemejobDCAVault.DCAMode.Buy, ONE_TOKEN, 1 days);
    vault.scheduleNextRun(type(uint256).max);
    address previousSchedule = vault.nextSchedule();

    vault.configureDCA(address(memeToken), MemejobDCAVault.DCAMode.Sell, ONE_TOKEN, 2 days);
    vm.stopPrank();

    assertEq(vault.nextSchedule(), address(0), "old schedule should be cleared");
    assertEq(_hss().lastDeletedSchedule(), previousSchedule, "old schedule should be deleted in HSS");
  }

  function test_runDCABuyExecutesTradeAndReschedules() public {
    uint256 expectedCost = ONE_TOKEN * PRICE_PER_UNIT;

    vm.deal(owner, 5 ether);
    vm.startPrank(owner);
    vault.deposit{value: 2 ether}();
    vault.configureDCA(address(memeToken), MemejobDCAVault.DCAMode.Buy, ONE_TOKEN, 1 days);
    vault.scheduleNextRun(type(uint256).max);
    vm.warp(block.timestamp + 1 days);

    uint256 balanceBefore = address(vault).balance;
    vault.runDCA(type(uint256).max);
    vm.stopPrank();

    assertEq(memeToken.balanceOf(address(vault)), ONE_TOKEN, "vault should receive bought tokens");
    assertEq(address(vault).balance, balanceBefore - expectedCost, "vault should spend quoted HBAR");
    assertTrue(vault.nextSchedule() != address(0), "vault should create next schedule");
  }

  function test_runDCASellExecutesTradeAndReschedules() public {
    uint256 expectedReturn = ONE_TOKEN * PRICE_PER_UNIT;
    vm.deal(address(mockMemeJob), 2 ether);

    memeToken.mint(owner, ONE_TOKEN);

    vm.startPrank(owner);
    memeToken.approve(address(vault), ONE_TOKEN);
    vault.depositTokens(address(memeToken), ONE_TOKEN);
    vault.configureDCA(address(memeToken), MemejobDCAVault.DCAMode.Sell, ONE_TOKEN, 1 days);
    vault.scheduleNextRun(type(uint256).max);
    vm.warp(block.timestamp + 1 days);

    uint256 hbarBefore = address(vault).balance;
    vault.runDCA(type(uint256).max);
    vm.stopPrank();

    assertEq(address(vault).balance, hbarBefore + expectedReturn, "vault should receive HBAR return");
    assertEq(memeToken.balanceOf(address(vault)), 0, "vault should sell configured token amount");
    assertTrue(vault.nextSchedule() != address(0), "vault should create next schedule");
  }

  function test_getSellReturnUsesMockPrice() public {
    vm.prank(owner);
    vault.configureDCA(address(memeToken), MemejobDCAVault.DCAMode.Sell, ONE_TOKEN, 1 days);

    uint256 quoted = vault.getSellReturn(ONE_TOKEN);
    assertEq(quoted, ONE_TOKEN * PRICE_PER_UNIT, "sell helper should return price based on tokenPricePerUnit");
  }

  function _hss() internal pure returns (MockHederaScheduleService) {
    return MockHederaScheduleService(HSS_ADDRESS);
  }
}
