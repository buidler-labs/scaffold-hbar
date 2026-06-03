import { expect } from "chai";
import { ethers } from "hardhat";
import { DcaOrchestratorHarness, MockBridgeSender } from "../typechain-types";

const TARGET_TOKEN = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
const AMOUNT = ethers.parseUnits("100", 6);
const INTERVAL = 3600n;
const MIN_AMOUNT_OUT = ethers.parseUnits("0.04", 18);
const FEE_FOR_SENDER = ethers.parseEther("0.001");

async function deployAll() {
  const [owner, other] = await ethers.getSigners();

  const mockBridgeSender = (await (
    await ethers.getContractFactory("MockBridgeSender")
  ).deploy()) as MockBridgeSender;

  const harness = (await (
    await ethers.getContractFactory("DcaOrchestratorHarness")
  ).deploy(await mockBridgeSender.getAddress())) as DcaOrchestratorHarness;

  await owner.sendTransaction({ to: await harness.getAddress(), value: ethers.parseEther("1") });

  return { harness, mockBridgeSender, owner, other };
}

async function advanceInterval() {
  await ethers.provider.send("evm_increaseTime", [Number(INTERVAL)]);
  await ethers.provider.send("evm_mine", []);
}

describe("DcaOrchestrator — createPlan / cancelPlan", function () {
  it("assigns sequential plan IDs starting at 0", async function () {
    const { harness } = await deployAll();
    await harness.createPlan(AMOUNT, FEE_FOR_SENDER, INTERVAL, TARGET_TOKEN, MIN_AMOUNT_OUT, 5);
    await harness.createPlan(AMOUNT, FEE_FOR_SENDER, INTERVAL, TARGET_TOKEN, MIN_AMOUNT_OUT, 5);
    expect(await harness.nextPlanId()).to.equal(2n);
  });

  it("stores all plan fields correctly", async function () {
    const { harness, owner } = await deployAll();
    await harness.createPlan(AMOUNT, FEE_FOR_SENDER, INTERVAL, TARGET_TOKEN, MIN_AMOUNT_OUT, 5);
    const plan = await harness.plans(0);
    expect(plan.owner).to.equal(owner.address);
    expect(plan.amountPerExecution).to.equal(AMOUNT);
    expect(plan.feeForSender).to.equal(FEE_FOR_SENDER);
    expect(plan.intervalSeconds).to.equal(INTERVAL);
    expect(plan.targetToken).to.equal(TARGET_TOKEN);
    expect(plan.minAmountOut).to.equal(MIN_AMOUNT_OUT);
    expect(plan.maxExecutions).to.equal(5n);
    expect(plan.executionCount).to.equal(0n);
    expect(plan.active).to.be.true;
    expect(plan.lastExecutionTime).to.equal(0n);
  });

  it("emits PlanCreated with correct arguments", async function () {
    const { harness, owner } = await deployAll();
    await expect(
      harness.createPlan(AMOUNT, FEE_FOR_SENDER, INTERVAL, TARGET_TOKEN, MIN_AMOUNT_OUT, 5)
    )
      .to.emit(harness, "PlanCreated")
      .withArgs(0n, owner.address, AMOUNT, FEE_FOR_SENDER, INTERVAL, TARGET_TOKEN);
  });

  it("calls _scheduleNextExecution on createPlan", async function () {
    const { harness } = await deployAll();
    await harness.createPlan(AMOUNT, FEE_FOR_SENDER, INTERVAL, TARGET_TOKEN, MIN_AMOUNT_OUT, 5);
    expect(await harness.scheduleCallCount()).to.equal(1n);
  });

  it("exposes the bridge sender address via bridgeSender()", async function () {
    const { harness, mockBridgeSender } = await deployAll();
    expect(await harness.bridgeSender()).to.equal(await mockBridgeSender.getAddress());
  });

  it("reverts when amountPerExecution is 0", async function () {
    const { harness } = await deployAll();
    await expect(
      harness.createPlan(0, FEE_FOR_SENDER, INTERVAL, TARGET_TOKEN, MIN_AMOUNT_OUT, 5)
    ).to.be.revertedWith("DcaOrchestrator: amount must be > 0");
  });

  it("reverts when intervalSeconds is 0", async function () {
    const { harness } = await deployAll();
    await expect(
      harness.createPlan(AMOUNT, FEE_FOR_SENDER, 0, TARGET_TOKEN, MIN_AMOUNT_OUT, 5)
    ).to.be.revertedWith("DcaOrchestrator: interval must be > 0");
  });

  it("reverts when targetToken is zero address", async function () {
    const { harness } = await deployAll();
    await expect(
      harness.createPlan(AMOUNT, FEE_FOR_SENDER, INTERVAL, ethers.ZeroAddress, MIN_AMOUNT_OUT, 5)
    ).to.be.revertedWith("DcaOrchestrator: invalid target token");
  });

  it("accepts maxExecutions = 0 (unlimited)", async function () {
    const { harness } = await deployAll();
    await harness.createPlan(AMOUNT, FEE_FOR_SENDER, INTERVAL, TARGET_TOKEN, MIN_AMOUNT_OUT, 0);
    expect((await harness.plans(0)).maxExecutions).to.equal(0n);
  });

  it("cancelPlan sets active to false and emits PlanCancelled", async function () {
    const { harness, owner } = await deployAll();
    await harness.createPlan(AMOUNT, FEE_FOR_SENDER, INTERVAL, TARGET_TOKEN, MIN_AMOUNT_OUT, 5);
    await expect(harness.cancelPlan(0))
      .to.emit(harness, "PlanCancelled")
      .withArgs(0n, owner.address);
    expect((await harness.plans(0)).active).to.be.false;
  });

  it("cancelPlan reverts when called by non-owner", async function () {
    const { harness, other } = await deployAll();
    await harness.createPlan(AMOUNT, FEE_FOR_SENDER, INTERVAL, TARGET_TOKEN, MIN_AMOUNT_OUT, 5);
    await expect(harness.connect(other).cancelPlan(0)).to.be.revertedWith(
      "DcaOrchestrator: not plan owner"
    );
  });

  it("cancelPlan reverts for non-existent plan", async function () {
    const { harness } = await deployAll();
    await expect(harness.cancelPlan(999)).to.be.revertedWith("DcaOrchestrator: not plan owner");
  });
});

describe("DcaOrchestrator — owner / withdraw()", function () {
  it("owner is set to the deployer", async function () {
    const { harness, owner } = await deployAll();
    expect(await harness.owner()).to.equal(owner.address);
  });

  it("transfers the full balance to the owner", async function () {
    const { harness, owner } = await deployAll();
    const extra = ethers.parseEther("0.5");
    await owner.sendTransaction({ to: await harness.getAddress(), value: extra });

    const balanceBefore = await ethers.provider.getBalance(await harness.getAddress());
    const ownerBefore = await ethers.provider.getBalance(owner.address);

    const tx = await harness.withdraw();
    const receipt = await tx.wait();
    const gasCost = receipt!.gasUsed * receipt!.gasPrice;

    const ownerAfter = await ethers.provider.getBalance(owner.address);
    expect(ownerAfter - ownerBefore + gasCost).to.equal(balanceBefore);
    expect(await ethers.provider.getBalance(await harness.getAddress())).to.equal(0n);
  });

  it("reverts when called by non-owner", async function () {
    const { harness, other } = await deployAll();
    await expect(harness.connect(other).withdraw()).to.be.revertedWith(
      "DcaOrchestrator: not owner"
    );
  });

  it("reverts when contract balance is zero", async function () {
    const mockBridgeSender = await (await ethers.getContractFactory("MockBridgeSender")).deploy();
    const harness = await (
      await ethers.getContractFactory("DcaOrchestratorHarness")
    ).deploy(await mockBridgeSender.getAddress());
    await expect(harness.withdraw()).to.be.revertedWith("DcaOrchestrator: nothing to withdraw");
  });
});

describe("DcaOrchestrator — executeDca", function () {
  it("reverts when plan is inactive", async function () {
    const { harness } = await deployAll();
    await harness.createPlan(AMOUNT, FEE_FOR_SENDER, INTERVAL, TARGET_TOKEN, MIN_AMOUNT_OUT, 5);
    await harness.cancelPlan(0);
    await expect(harness.executeDca(0)).to.be.revertedWith("DcaOrchestrator: plan not active");
  });

  it("reverts when called again before interval has elapsed", async function () {
    const { harness } = await deployAll();
    await harness.createPlan(AMOUNT, FEE_FOR_SENDER, INTERVAL, TARGET_TOKEN, MIN_AMOUNT_OUT, 5);
    await harness.executeDca(0);
    await expect(harness.executeDca(0)).to.be.revertedWith("DcaOrchestrator: too soon");
  });

  it("allows execution after interval has elapsed", async function () {
    const { harness } = await deployAll();
    await harness.createPlan(AMOUNT, FEE_FOR_SENDER, INTERVAL, TARGET_TOKEN, MIN_AMOUNT_OUT, 5);
    await harness.executeDca(0);
    await advanceInterval();
    await expect(harness.executeDca(0)).to.not.be.reverted;
  });

  it("increments executionCount", async function () {
    const { harness } = await deployAll();
    await harness.createPlan(AMOUNT, FEE_FOR_SENDER, INTERVAL, TARGET_TOKEN, MIN_AMOUNT_OUT, 5);
    await harness.executeDca(0);
    expect((await harness.plans(0)).executionCount).to.equal(1n);
    await advanceInterval();
    await harness.executeDca(0);
    expect((await harness.plans(0)).executionCount).to.equal(2n);
  });

  it("emits ExecutionTriggered with correct executionCount", async function () {
    const { harness } = await deployAll();
    await harness.createPlan(AMOUNT, FEE_FOR_SENDER, INTERVAL, TARGET_TOKEN, MIN_AMOUNT_OUT, 5);
    await expect(harness.executeDca(0)).to.emit(harness, "ExecutionTriggered").withArgs(0n, 1n);
  });

  it("calls bridgeSender.send once with correct plan data", async function () {
    const { harness, mockBridgeSender } = await deployAll();
    await harness.createPlan(AMOUNT, FEE_FOR_SENDER, INTERVAL, TARGET_TOKEN, MIN_AMOUNT_OUT, 5);
    await harness.executeDca(0);

    expect(await mockBridgeSender.callCount()).to.equal(1n);
    expect(await mockBridgeSender.lastPlanId()).to.equal(0n);
    expect(await mockBridgeSender.lastAmountPerExecution()).to.equal(AMOUNT);
    expect(await mockBridgeSender.lastTargetToken()).to.equal(TARGET_TOKEN);
    expect(await mockBridgeSender.lastMinAmountOut()).to.equal(MIN_AMOUNT_OUT);
  });

  it("passes the correct planId when multiple plans exist", async function () {
    const { harness, mockBridgeSender } = await deployAll();
    await harness.createPlan(AMOUNT, FEE_FOR_SENDER, INTERVAL, TARGET_TOKEN, MIN_AMOUNT_OUT, 5);
    await harness.createPlan(AMOUNT * 2n, FEE_FOR_SENDER, INTERVAL, TARGET_TOKEN, MIN_AMOUNT_OUT, 5);

    await harness.executeDca(1);
    expect(await mockBridgeSender.lastPlanId()).to.equal(1n);
    expect(await mockBridgeSender.lastAmountPerExecution()).to.equal(AMOUNT * 2n);
  });

  it("reschedules next execution when plan is still active", async function () {
    const { harness } = await deployAll();
    await harness.createPlan(AMOUNT, FEE_FOR_SENDER, INTERVAL, TARGET_TOKEN, MIN_AMOUNT_OUT, 5);
    const beforeCount = await harness.scheduleCallCount();
    await harness.executeDca(0);
    expect(await harness.scheduleCallCount()).to.equal(beforeCount + 1n);
  });

  it("deactivates plan and emits PlanCancelled when maxExecutions reached", async function () {
    const { harness, owner } = await deployAll();
    await harness.createPlan(AMOUNT, FEE_FOR_SENDER, INTERVAL, TARGET_TOKEN, MIN_AMOUNT_OUT, 2);

    await harness.executeDca(0);
    expect((await harness.plans(0)).active).to.be.true;

    await advanceInterval();
    await expect(harness.executeDca(0))
      .to.emit(harness, "PlanCancelled")
      .withArgs(0n, owner.address);

    expect((await harness.plans(0)).active).to.be.false;
    expect((await harness.plans(0)).executionCount).to.equal(2n);
  });

  it("does not reschedule when plan terminates at maxExecutions", async function () {
    const { harness } = await deployAll();
    await harness.createPlan(AMOUNT, FEE_FOR_SENDER, INTERVAL, TARGET_TOKEN, MIN_AMOUNT_OUT, 1);
    const beforeCount = await harness.scheduleCallCount();
    await harness.executeDca(0);
    expect(await harness.scheduleCallCount()).to.equal(beforeCount);
  });

  it("unlimited plan (maxExecutions=0) never auto-terminates", async function () {
    const { harness } = await deployAll();
    await harness.createPlan(AMOUNT, FEE_FOR_SENDER, INTERVAL, TARGET_TOKEN, MIN_AMOUNT_OUT, 0);
    for (let i = 0; i < 5; i++) {
      if (i > 0) await advanceInterval();
      await harness.executeDca(0);
    }
    expect((await harness.plans(0)).active).to.be.true;
    expect((await harness.plans(0)).executionCount).to.equal(5n);
  });

  it("calls bridgeSender.send on every execution cycle", async function () {
    const { harness, mockBridgeSender } = await deployAll();
    await harness.createPlan(AMOUNT, FEE_FOR_SENDER, INTERVAL, TARGET_TOKEN, MIN_AMOUNT_OUT, 0);
    await harness.executeDca(0);
    await advanceInterval();
    await harness.executeDca(0);
    await advanceInterval();
    await harness.executeDca(0);
    expect(await mockBridgeSender.callCount()).to.equal(3n);
  });
});
