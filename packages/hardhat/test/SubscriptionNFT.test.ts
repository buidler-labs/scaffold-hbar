import { expect } from "chai";
import { ethers } from "hardhat";

describe("SubscriptionNFT", function () {
  async function deployFixture() {
    const [owner, alice, bob] = await ethers.getSigners();

    // Deploy MockHTS for testing (works with both local and forked networks)
    const MockHTS = await ethers.getContractFactory("MockHTS");
    const mockHTS = await MockHTS.deploy();
    await mockHTS.waitForDeployment();
    const htsAddress = await mockHTS.getAddress();

    // Deploy SubscriptionNFT with mock HTS
    const SubscriptionNFT = await ethers.getContractFactory("SubscriptionNFT");
    const subscriptionNFT = await SubscriptionNFT.deploy(owner.address, htsAddress);
    await subscriptionNFT.waitForDeployment();

    return { subscriptionNFT, owner, alice, bob };
  }

  describe("createCollection", function () {
    it("creates collection once and emits event", async function () {
      const { subscriptionNFT } = await deployFixture();

      await expect(subscriptionNFT.createCollection("Subscriptions", "SUB", "Rental template")).to.emit(
        subscriptionNFT,
        "CollectionCreated",
      );

      const collectionAddress = await subscriptionNFT.collectionAddress();
      expect(collectionAddress).to.not.equal(ethers.ZeroAddress);
    });

    it("reverts when called a second time", async function () {
      const { subscriptionNFT } = await deployFixture();
      await subscriptionNFT.createCollection("Subscriptions", "SUB", "Rental template");

      await expect(
        subscriptionNFT.createCollection("Subscriptions2", "SUB2", "Should fail"),
      ).to.be.revertedWithCustomError(subscriptionNFT, "CollectionAlreadyCreated");
    });
  });

  describe("mintSubscription", function () {
    it("mints and stores metadata on-chain", async function () {
      const { subscriptionNFT, alice } = await deployFixture();
      await subscriptionNFT.createCollection("Subscriptions", "SUB", "Rental template");

      const now = (await ethers.provider.getBlock("latest"))!.timestamp;
      const startDate = BigInt(now + 7 * 24 * 60 * 60);
      const endDate = BigInt(now + 37 * 24 * 60 * 60);

      await expect(
        subscriptionNFT.connect(alice).mintSubscription("Anytime Fitness", "Premium", startDate, endDate),
      ).to.emit(subscriptionNFT, "SubscriptionMinted");

      const serialNumber = 1n;
      const subscription = await subscriptionNFT.getSubscription(serialNumber);
      expect(subscription.minter).to.equal(alice.address);
      expect(subscription.provider).to.equal("Anytime Fitness");
      expect(subscription.serviceTier).to.equal("Premium");
      expect(subscription.startDate).to.equal(startDate);
      expect(subscription.endDate).to.equal(endDate);

      const currentOwner = await subscriptionNFT.currentOwner(serialNumber);
      expect(currentOwner).to.equal(alice.address);
    });

    it("reverts with invalid date range", async function () {
      const { subscriptionNFT, alice } = await deployFixture();
      await subscriptionNFT.createCollection("Subscriptions", "SUB", "Rental template");

      const now = BigInt((await ethers.provider.getBlock("latest"))!.timestamp);
      await expect(
        subscriptionNFT.connect(alice).mintSubscription("Provider", "Tier", now + 100n, now + 100n),
      ).to.be.revertedWithCustomError(subscriptionNFT, "InvalidDateRange");
    });
  });

  describe("read helpers", function () {
    it("reports end date and expiration correctly", async function () {
      const { subscriptionNFT, alice } = await deployFixture();
      await subscriptionNFT.createCollection("Subscriptions", "SUB", "Rental template");

      const now = (await ethers.provider.getBlock("latest"))!.timestamp;
      const startDate = BigInt(now + 10);
      const endDate = BigInt(now + 1000);
      await subscriptionNFT.connect(alice).mintSubscription("Provider", "Tier", startDate, endDate);

      expect(await subscriptionNFT.getEndDate(1n)).to.equal(endDate);
      expect(await subscriptionNFT.isExpired(1n)).to.equal(false);

      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(endDate) + 1]);
      await ethers.provider.send("evm_mine", []);
      expect(await subscriptionNFT.isExpired(1n)).to.equal(true);
    });
  });
});
