import { expect } from "chai";
import { ethers } from "hardhat";
import { DcaExecutor, MockSwapRouter, MockERC20 } from "../typechain-types";

const AMOUNT_IN = ethers.parseUnits("100", 6);
const MOCK_AMOUNT_OUT = ethers.parseUnits("0.05", 18);
const MIN_AMOUNT_OUT = ethers.parseUnits("0.04", 18);

async function deployAll() {
  const [owner, caller, other] = await ethers.getSigners();

  const router = (await (
    await ethers.getContractFactory("MockSwapRouter")
  ).deploy()) as MockSwapRouter;

  const usdc = (await (
    await ethers.getContractFactory("MockERC20")
  ).deploy("USD Coin", "USDC", 6)) as MockERC20;

  const weth = (await (
    await ethers.getContractFactory("MockERC20")
  ).deploy("Wrapped Ether", "WETH", 18)) as MockERC20;

  const executor = (await (
    await ethers.getContractFactory("DcaExecutor")
  ).deploy(await router.getAddress(), await usdc.getAddress())) as DcaExecutor;

  await usdc.mint(await executor.getAddress(), ethers.parseUnits("10000", 6));
  await router.setMockAmountOut(MOCK_AMOUNT_OUT);
  await executor.setAuthorizedCaller(caller.address);

  return { executor, router, usdc, weth, owner, caller, other };
}

describe("DcaExecutor — access control", function () {
  it("owner is set to the deployer", async function () {
    const { executor, owner } = await deployAll();
    expect(await executor.owner()).to.equal(owner.address);
  });

  it("setAuthorizedCaller stores the caller and emits AuthorizedCallerSet", async function () {
    const { executor, other } = await deployAll();
    await expect(executor.setAuthorizedCaller(other.address))
      .to.emit(executor, "AuthorizedCallerSet")
      .withArgs(other.address);
    expect(await executor.authorizedCaller()).to.equal(other.address);
  });

  it("setAuthorizedCaller reverts for non-owner", async function () {
    const { executor, other } = await deployAll();
    await expect(executor.connect(other).setAuthorizedCaller(other.address)).to.be.revertedWith(
      "DcaExecutor: not owner"
    );
  });

  it("setAuthorizedCaller reverts for zero address", async function () {
    const { executor } = await deployAll();
    await expect(executor.setAuthorizedCaller(ethers.ZeroAddress)).to.be.revertedWith(
      "DcaExecutor: zero address"
    );
  });

  it("handleDcaExecution reverts for non-authorized caller", async function () {
    const { executor, weth, other } = await deployAll();
    await expect(
      executor.connect(other).handleDcaExecution(0n, AMOUNT_IN, await weth.getAddress(), MIN_AMOUNT_OUT)
    ).to.be.revertedWith("DcaExecutor: not authorized");
  });
});

describe("DcaExecutor — handleDcaExecution swap", function () {
  it("calls exactInputSingle with correct params", async function () {
    const { executor, router, usdc, weth, caller } = await deployAll();

    await executor.connect(caller).handleDcaExecution(42n, AMOUNT_IN, await weth.getAddress(), MIN_AMOUNT_OUT);

    expect(await router.callCount()).to.equal(1n);
    expect(await router.lastTokenIn()).to.equal(await usdc.getAddress());
    expect(await router.lastTokenOut()).to.equal(await weth.getAddress());
    expect(await router.lastAmountIn()).to.equal(AMOUNT_IN);
    expect(await router.lastAmountOutMinimum()).to.equal(MIN_AMOUNT_OUT);
    expect(await router.lastRecipient()).to.equal(await executor.getAddress());
  });

  it("approves swapRouter for amountIn before calling swap", async function () {
    const { executor, router, usdc, weth, caller } = await deployAll();

    await executor.connect(caller).handleDcaExecution(1n, AMOUNT_IN, await weth.getAddress(), MIN_AMOUNT_OUT);

    const routerBalance = await usdc.balanceOf(await router.getAddress());
    expect(routerBalance).to.equal(AMOUNT_IN);
  });

  it("emits SwapExecuted with correct values", async function () {
    const { executor, weth, caller } = await deployAll();

    await expect(
      executor.connect(caller).handleDcaExecution(7n, AMOUNT_IN, await weth.getAddress(), 100)
    )
      .to.emit(executor, "SwapExecuted")
      .withArgs(7n, AMOUNT_IN, MOCK_AMOUNT_OUT, await weth.getAddress());
  });

  it("handles different planIds independently — swap executes each time", async function () {
    const { executor, router, weth, caller } = await deployAll();

    await executor.connect(caller).handleDcaExecution(0n, AMOUNT_IN, await weth.getAddress(), MIN_AMOUNT_OUT);
    await executor.connect(caller).handleDcaExecution(1n, AMOUNT_IN, await weth.getAddress(), MIN_AMOUNT_OUT);

    expect(await router.callCount()).to.equal(2n);
  });

  it("accumulated source tokens stay in executor after multiple swaps", async function () {
    const { executor, usdc, weth, caller } = await deployAll();
    const initialBalance = await usdc.balanceOf(await executor.getAddress());

    await executor.connect(caller).handleDcaExecution(0n, AMOUNT_IN, await weth.getAddress(), MIN_AMOUNT_OUT);
    await executor.connect(caller).handleDcaExecution(1n, AMOUNT_IN, await weth.getAddress(), MIN_AMOUNT_OUT);

    const remaining = await usdc.balanceOf(await executor.getAddress());
    expect(remaining).to.equal(initialBalance - AMOUNT_IN * 2n);
  });
});

describe("DcaExecutor — withdrawETH()", function () {
  it("transfers the full ETH balance to the owner", async function () {
    const { executor, owner } = await deployAll();
    const deposit = ethers.parseEther("0.5");
    await owner.sendTransaction({ to: await executor.getAddress(), value: deposit });

    const ownerBefore = await ethers.provider.getBalance(owner.address);
    const tx = await executor.withdrawETH();
    const receipt = await tx.wait();
    const gasCost = receipt!.gasUsed * receipt!.gasPrice;
    const ownerAfter = await ethers.provider.getBalance(owner.address);

    expect(ownerAfter - ownerBefore + gasCost).to.equal(deposit);
    expect(await ethers.provider.getBalance(await executor.getAddress())).to.equal(0n);
  });

  it("reverts when called by non-owner", async function () {
    const { executor, other } = await deployAll();
    await expect(executor.connect(other).withdrawETH()).to.be.revertedWith("DcaExecutor: not owner");
  });

  it("reverts when ETH balance is zero", async function () {
    const { executor } = await deployAll();
    await expect(executor.withdrawETH()).to.be.revertedWith("DcaExecutor: nothing to withdraw");
  });
});

describe("DcaExecutor — withdrawToken()", function () {
  it("transfers the full ERC-20 balance to the owner", async function () {
    const { executor, usdc, owner } = await deployAll();
    const executorAddr = await executor.getAddress();
    const balanceBefore = await usdc.balanceOf(executorAddr);
    expect(balanceBefore).to.be.gt(0n);

    await executor.withdrawToken(await usdc.getAddress());

    expect(await usdc.balanceOf(executorAddr)).to.equal(0n);
    expect(await usdc.balanceOf(owner.address)).to.equal(balanceBefore);
  });

  it("withdraws accumulated tokenOut after swaps", async function () {
    const { executor, weth, owner } = await deployAll();
    const executorAddr = await executor.getAddress();

    await weth.mint(executorAddr, MOCK_AMOUNT_OUT);
    await executor.withdrawToken(await weth.getAddress());

    expect(await weth.balanceOf(executorAddr)).to.equal(0n);
    expect(await weth.balanceOf(owner.address)).to.equal(MOCK_AMOUNT_OUT);
  });

  it("reverts when called by non-owner", async function () {
    const { executor, usdc, other } = await deployAll();
    await expect(executor.connect(other).withdrawToken(await usdc.getAddress())).to.be.revertedWith(
      "DcaExecutor: not owner"
    );
  });

  it("reverts for zero token address", async function () {
    const { executor } = await deployAll();
    await expect(executor.withdrawToken(ethers.ZeroAddress)).to.be.revertedWith(
      "DcaExecutor: zero token address"
    );
  });

  it("reverts when token balance is zero", async function () {
    const { executor, weth } = await deployAll();
    await expect(executor.withdrawToken(await weth.getAddress())).to.be.revertedWith(
      "DcaExecutor: nothing to withdraw"
    );
  });
});

describe("DcaExecutor — constructor guards", function () {
  it("reverts for zero swap router", async function () {
    const factory = await ethers.getContractFactory("DcaExecutor");
    const usdc = await (await ethers.getContractFactory("MockERC20")).deploy("USD Coin", "USDC", 6);
    await expect(factory.deploy(ethers.ZeroAddress, await usdc.getAddress())).to.be.revertedWith(
      "DcaExecutor: zero swap router"
    );
  });

  it("reverts for zero source token", async function () {
    const factory = await ethers.getContractFactory("DcaExecutor");
    const router = await (await ethers.getContractFactory("MockSwapRouter")).deploy();
    await expect(factory.deploy(await router.getAddress(), ethers.ZeroAddress)).to.be.revertedWith(
      "DcaExecutor: zero source token"
    );
  });
});
