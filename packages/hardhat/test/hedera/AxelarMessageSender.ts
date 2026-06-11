import { expect } from "chai";
import { ethers } from "hardhat";
import { AxelarMessageSender, MockAxelarGateway, MockAxelarGasService } from "../../typechain-types";

const DESTINATION_CHAIN = "ethereum-sepolia";
const DESTINATION_ADDRESS = "0x1234567890123456789012345678901234567890";
const AXELAR_GAS_FEE = ethers.parseEther("0.01");

const TARGET_TOKEN = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
const AMOUNT = ethers.parseUnits("100", 6);
const MIN_AMOUNT_OUT = ethers.parseUnits("0.04", 18);
const PLAN_ID = 7n;

async function deployAll() {
  const [owner, caller, other] = await ethers.getSigners();

  const gateway = (await (await ethers.getContractFactory("MockAxelarGateway")).deploy()) as MockAxelarGateway;

  const gasService = (await (await ethers.getContractFactory("MockAxelarGasService")).deploy()) as MockAxelarGasService;

  const sender = (await (
    await ethers.getContractFactory("AxelarMessageSender")
  ).deploy(
    await gateway.getAddress(),
    await gasService.getAddress(),
    DESTINATION_CHAIN,
    DESTINATION_ADDRESS,
  )) as AxelarMessageSender;

  await sender.setAuthorizedCaller(caller.address);

  return { sender, gateway, gasService, owner, caller, other };
}

describe("AxelarMessageSender — access control", function () {
  it("owner is set to the deployer", async function () {
    const { sender, owner } = await deployAll();
    expect(await sender.owner()).to.equal(owner.address);
  });

  it("setAuthorizedCaller stores the caller and emits AuthorizedCallerSet", async function () {
    const { sender, other } = await deployAll();
    await expect(sender.setAuthorizedCaller(other.address))
      .to.emit(sender, "AuthorizedCallerSet")
      .withArgs(other.address);
    expect(await sender.authorizedCaller()).to.equal(other.address);
  });

  it("setAuthorizedCaller reverts for non-owner", async function () {
    const { sender, other } = await deployAll();
    await expect(sender.connect(other).setAuthorizedCaller(other.address)).to.be.revertedWith(
      "AxelarMessageSender: not owner",
    );
  });

  it("setAuthorizedCaller reverts for zero address", async function () {
    const { sender } = await deployAll();
    await expect(sender.setAuthorizedCaller(ethers.ZeroAddress)).to.be.revertedWith(
      "AxelarMessageSender: zero address",
    );
  });

  it("send() reverts for non-authorized caller", async function () {
    const { sender, other } = await deployAll();
    await expect(sender.connect(other).send(PLAN_ID, AMOUNT, TARGET_TOKEN, MIN_AMOUNT_OUT)).to.be.revertedWith(
      "AxelarMessageSender: not authorized",
    );
  });
});

describe("AxelarMessageSender — send()", function () {
  it("calls gas service with correct value and routing", async function () {
    const { sender, gasService, caller } = await deployAll();

    await sender.connect(caller).send(PLAN_ID, AMOUNT, TARGET_TOKEN, MIN_AMOUNT_OUT, { value: AXELAR_GAS_FEE });

    expect(await gasService.callCount()).to.equal(1n);
    expect(await gasService.lastValue()).to.equal(AXELAR_GAS_FEE);
    expect(await gasService.lastDestinationChain()).to.equal(DESTINATION_CHAIN);
    expect(await gasService.lastDestinationAddress()).to.equal(DESTINATION_ADDRESS);
    expect(await gasService.lastSender()).to.equal(await sender.getAddress());
    expect(await gasService.lastRefundAddress()).to.equal(caller.address);
  });

  it("calls gateway with correct destination", async function () {
    const { sender, gateway, caller } = await deployAll();

    await sender.connect(caller).send(PLAN_ID, AMOUNT, TARGET_TOKEN, MIN_AMOUNT_OUT, { value: AXELAR_GAS_FEE });

    expect(await gateway.callCount()).to.equal(1n);
    expect(await gateway.lastDestinationChain()).to.equal(DESTINATION_CHAIN);
    expect(await gateway.lastDestinationAddress()).to.equal(DESTINATION_ADDRESS);
  });

  it("encodes the payload as (planId, amountPerExecution, targetToken, minAmountOut)", async function () {
    const { sender, gateway, gasService, caller } = await deployAll();

    await sender.connect(caller).send(PLAN_ID, AMOUNT, TARGET_TOKEN, MIN_AMOUNT_OUT, { value: AXELAR_GAS_FEE });

    const expectedPayload = ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256", "uint256", "address", "uint256"],
      [PLAN_ID, AMOUNT, TARGET_TOKEN, MIN_AMOUNT_OUT],
    );
    expect(await gateway.lastPayload()).to.equal(expectedPayload);
    expect(await gasService.lastPayload()).to.equal(expectedPayload);
  });

  it("accepts native token deposits via receive()", async function () {
    const { sender } = await deployAll();
    const [funder] = await ethers.getSigners();
    const deposit = ethers.parseEther("0.5");
    const before = await ethers.provider.getBalance(await sender.getAddress());
    await funder.sendTransaction({ to: await sender.getAddress(), value: deposit });
    const after = await ethers.provider.getBalance(await sender.getAddress());
    expect(after - before).to.equal(deposit);
  });

  it("reverts when called with zero msg.value", async function () {
    const { sender, caller } = await deployAll();
    await expect(sender.connect(caller).send(PLAN_ID, AMOUNT, TARGET_TOKEN, MIN_AMOUNT_OUT)).to.be.revertedWith(
      "AxelarMessageSender: zero value",
    );
  });
});

describe("AxelarMessageSender — withdraw()", function () {
  it("transfers the full balance to the owner", async function () {
    const { sender, owner } = await deployAll();
    const deposit = ethers.parseEther("0.5");
    await owner.sendTransaction({ to: await sender.getAddress(), value: deposit });

    const ownerBefore = await ethers.provider.getBalance(owner.address);
    const tx = await sender.withdraw();
    const receipt = await tx.wait();
    const gasCost = receipt!.gasUsed * receipt!.gasPrice;
    const ownerAfter = await ethers.provider.getBalance(owner.address);

    expect(ownerAfter - ownerBefore + gasCost).to.equal(deposit);
    expect(await ethers.provider.getBalance(await sender.getAddress())).to.equal(0n);
  });

  it("reverts when called by non-owner", async function () {
    const { sender, other } = await deployAll();
    await expect(sender.connect(other).withdraw()).to.be.revertedWith("AxelarMessageSender: not owner");
  });

  it("reverts when contract balance is zero", async function () {
    const { sender } = await deployAll();
    await expect(sender.withdraw()).to.be.revertedWith("AxelarMessageSender: nothing to withdraw");
  });
});

describe("AxelarMessageSender — configuration", function () {
  it("stores destination chain and address", async function () {
    const { sender } = await deployAll();
    expect(await sender.destinationChain()).to.equal(DESTINATION_CHAIN);
    expect(await sender.destinationAddress()).to.equal(DESTINATION_ADDRESS);
  });

  it("constructor reverts for zero gateway", async function () {
    const { gasService } = await deployAll();
    const factory = await ethers.getContractFactory("AxelarMessageSender");
    await expect(
      factory.deploy(ethers.ZeroAddress, await gasService.getAddress(), DESTINATION_CHAIN, DESTINATION_ADDRESS),
    ).to.be.revertedWith("AxelarMessageSender: zero gateway");
  });

  it("constructor reverts for zero gas service", async function () {
    const { gateway } = await deployAll();
    const factory = await ethers.getContractFactory("AxelarMessageSender");
    await expect(
      factory.deploy(await gateway.getAddress(), ethers.ZeroAddress, DESTINATION_CHAIN, DESTINATION_ADDRESS),
    ).to.be.revertedWith("AxelarMessageSender: zero gas service");
  });
});
