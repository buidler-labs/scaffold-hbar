import { expect } from "chai";
import { ethers } from "hardhat";

describe("SubscriptionMarketplace", function () {
  before(function () {
    if (process.env.HEDERA_FORKING !== "true") {
      throw new Error("SubscriptionMarketplace tests require HEDERA_FORKING=true");
    }
  });

  const DAY = 24 * 60 * 60;

  const alignToDay = (timestamp: number): bigint => {
    const aligned = timestamp - (timestamp % DAY);
    return BigInt(aligned);
  };

  async function deployFixture() {
    const [deployer, owner, renterA, renterB] = await ethers.getSigners();

    const SubscriptionNFT = await ethers.getContractFactory("SubscriptionNFT");
    const subscriptionNFT = await SubscriptionNFT.deploy(owner.address);
    await subscriptionNFT.waitForDeployment();

    const createValue = 100_000_000n;
    await subscriptionNFT
      .connect(owner)
      .createCollection("Subscriptions", "SUB", "Rental template", { value: createValue });

    const now = (await ethers.provider.getBlock("latest"))!.timestamp;
    const dayBase = alignToDay(now);
    const startDate = dayBase + 10n * BigInt(DAY);
    const endDate = dayBase + 120n * BigInt(DAY);
    await subscriptionNFT.connect(owner).mintSubscription("Anytime Fitness", "Premium", startDate, endDate);

    const Marketplace = await ethers.getContractFactory("SubscriptionMarketplace");
    const marketplaceFeeBps = 500; // 5%
    const marketplace = await Marketplace.deploy(
      deployer.address,
      await subscriptionNFT.getAddress(),
      marketplaceFeeBps,
    );
    await marketplace.waitForDeployment();

    return { subscriptionNFT, marketplace, deployer, owner, renterA, renterB, startDate, endDate };
  }

  describe("availability", function () {
    it("allows current owner to create availability and rejects overlap", async function () {
      const { marketplace, owner, startDate } = await deployFixture();
      const windowStart = startDate + 10n * BigInt(DAY);
      const windowEnd = windowStart + 20n * BigInt(DAY);
      const pricePerDay = ethers.parseEther("0.1");

      await expect(marketplace.connect(owner).createAvailability(1n, windowStart, windowEnd, pricePerDay)).to.emit(
        marketplace,
        "AvailabilityCreated",
      );

      await expect(
        marketplace
          .connect(owner)
          .createAvailability(1n, windowStart + 5n * BigInt(DAY), windowEnd + 5n * BigInt(DAY), pricePerDay),
      ).to.be.revertedWithCustomError(marketplace, "OverlappingAvailability");
    });

    it("rejects non-owner availability creation", async function () {
      const { marketplace, renterA, startDate } = await deployFixture();
      const windowStart = startDate + 10n * BigInt(DAY);
      const windowEnd = windowStart + 10n * BigInt(DAY);
      const pricePerDay = ethers.parseEther("0.1");

      await expect(
        marketplace.connect(renterA).createAvailability(1n, windowStart, windowEnd, pricePerDay),
      ).to.be.revertedWithCustomError(marketplace, "UnauthorizedSubscriptionOwner");
    });
  });

  describe("booking", function () {
    it("books consecutive days with exact payment and rejects overlap", async function () {
      const { marketplace, owner, renterA, renterB, startDate } = await deployFixture();
      const windowStart = startDate + 10n * BigInt(DAY);
      const windowEnd = windowStart + 20n * BigInt(DAY);
      const pricePerDay = ethers.parseEther("0.1");
      await marketplace.connect(owner).createAvailability(1n, windowStart, windowEnd, pricePerDay);

      const firstBookingStart = windowStart;
      const firstBookingDays = 3n;
      const firstPayment = pricePerDay * firstBookingDays;

      await expect(
        marketplace.connect(renterA).book(1n, firstBookingStart, firstBookingDays, { value: firstPayment }),
      ).to.emit(marketplace, "Booked");

      await expect(
        marketplace.connect(renterB).book(1n, firstBookingStart + 1n * BigInt(DAY), 2n, { value: pricePerDay * 2n }),
      ).to.be.revertedWithCustomError(marketplace, "OverlappingBooking");
    });

    it("rejects incorrect payment", async function () {
      const { marketplace, owner, renterA, startDate } = await deployFixture();
      const windowStart = startDate + 10n * BigInt(DAY);
      const windowEnd = windowStart + 10n * BigInt(DAY);
      const pricePerDay = ethers.parseEther("0.1");
      await marketplace.connect(owner).createAvailability(1n, windowStart, windowEnd, pricePerDay);

      await expect(
        marketplace.connect(renterA).book(1n, windowStart, 2n, { value: pricePerDay }),
      ).to.be.revertedWithCustomError(marketplace, "IncorrectPayment");
    });
  });

  describe("userOf", function () {
    it("returns renter only during active booked period", async function () {
      const { marketplace, owner, renterA, startDate } = await deployFixture();
      const windowStart = startDate + 10n * BigInt(DAY);
      const windowEnd = windowStart + 10n * BigInt(DAY);
      const pricePerDay = ethers.parseEther("0.1");
      await marketplace.connect(owner).createAvailability(1n, windowStart, windowEnd, pricePerDay);

      await marketplace.connect(renterA).book(1n, windowStart, 2n, { value: pricePerDay * 2n });

      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(windowStart) - 10]);
      await ethers.provider.send("evm_mine", []);
      expect(await marketplace.userOf(1n)).to.equal(ethers.ZeroAddress);

      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(windowStart) + 1]);
      await ethers.provider.send("evm_mine", []);
      expect(await marketplace.userOf(1n)).to.equal(renterA.address);

      const bookingEnd = windowStart + 2n * BigInt(DAY);
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(bookingEnd) + 1]);
      await ethers.provider.send("evm_mine", []);
      expect(await marketplace.userOf(1n)).to.equal(ethers.ZeroAddress);
    });
  });

  describe("cancellation and payouts", function () {
    it("refunds full amount when renter cancels before booking start", async function () {
      const { marketplace, owner, renterA, startDate } = await deployFixture();
      const windowStart = startDate + 10n * BigInt(DAY);
      const windowEnd = windowStart + 10n * BigInt(DAY);
      const pricePerDay = ethers.parseEther("0.1");
      await marketplace.connect(owner).createAvailability(1n, windowStart, windowEnd, pricePerDay);

      const totalPaid = pricePerDay * 3n;
      await marketplace.connect(renterA).book(1n, windowStart, 3n, { value: totalPaid });

      await expect(marketplace.connect(renterA).cancelBooking(1n))
        .to.emit(marketplace, "BookingCancelled")
        .withArgs(1n, renterA.address, totalPaid);
    });

    it("allows owner to claim payout after booking start and accrues fee", async function () {
      const { marketplace, owner, renterA, startDate } = await deployFixture();
      const windowStart = startDate + 10n * BigInt(DAY);
      const windowEnd = windowStart + 10n * BigInt(DAY);
      const pricePerDay = ethers.parseEther("1");
      await marketplace.connect(owner).createAvailability(1n, windowStart, windowEnd, pricePerDay);

      const totalPaid = pricePerDay * 2n; // 2 ETH
      await marketplace.connect(renterA).book(1n, windowStart, 2n, { value: totalPaid });

      // Can't claim before start.
      await expect(marketplace.connect(owner).claimBookingPayout(1n)).to.be.revertedWithCustomError(
        marketplace,
        "PayoutNotAvailableYet",
      );

      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(windowStart) + 1]);
      await ethers.provider.send("evm_mine", []);

      await expect(marketplace.connect(owner).claimBookingPayout(1n)).to.emit(marketplace, "BookingPayoutClaimed");

      // 5% fee on 2 ETH = 0.1 ETH
      expect(await marketplace.accruedMarketplaceFees()).to.equal(ethers.parseEther("0.1"));
    });
  });
});
