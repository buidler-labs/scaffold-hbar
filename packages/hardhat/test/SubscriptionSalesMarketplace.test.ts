import { expect } from "chai";
import { ethers } from "hardhat";

describe("SubscriptionSalesMarketplace", function () {
  const DAY = 24 * 60 * 60;

  const alignToDay = (timestamp: number): bigint => {
    const aligned = timestamp - (timestamp % DAY);
    return BigInt(aligned);
  };

  async function deployFixture() {
    const [deployer, owner, buyer, bidderA, bidderB] = await ethers.getSigners();

    const MockHTS = await ethers.getContractFactory("MockHTS");
    const mockHTS = await MockHTS.deploy();
    await mockHTS.waitForDeployment();
    const htsAddress = await mockHTS.getAddress();

    const SubscriptionNFT = await ethers.getContractFactory("SubscriptionNFT");
    const subscriptionNFT = await SubscriptionNFT.deploy(owner.address, htsAddress);
    await subscriptionNFT.waitForDeployment();

    await subscriptionNFT.connect(owner).createCollection("Subscriptions", "SUB", "Sales template");

    const now = (await ethers.provider.getBlock("latest"))!.timestamp;
    const dayBase = alignToDay(now);
    const startDate = dayBase + 10n * BigInt(DAY);
    const endDate = dayBase + 120n * BigInt(DAY);

    await subscriptionNFT
      .connect(owner)
      .mintSubscription(deployer.address, "Anytime Fitness", "Premium", startDate, endDate);

    const RentalMarketplace = await ethers.getContractFactory("SubscriptionMarketplace");
    const rentalMarketplace = await RentalMarketplace.deploy(deployer.address, await subscriptionNFT.getAddress(), 500);
    await rentalMarketplace.waitForDeployment();

    const SalesMarketplace = await ethers.getContractFactory("SubscriptionSalesMarketplace");
    const salesMarketplace = await SalesMarketplace.deploy(
      deployer.address,
      await subscriptionNFT.getAddress(),
      await rentalMarketplace.getAddress(),
      500,
    );
    await salesMarketplace.waitForDeployment();

    const collectionAddress = await subscriptionNFT.collectionAddress();
    const collection = await ethers.getContractAt("IERC721", collectionAddress);

    return {
      subscriptionNFT,
      rentalMarketplace,
      salesMarketplace,
      collection,
      deployer,
      owner,
      buyer,
      bidderA,
      bidderB,
      startDate,
      endDate,
    };
  }

  describe("Fixed Price Listings", function () {
    it("creates fixed-price listing when owner and approved", async function () {
      const { salesMarketplace, collection, owner, startDate } = await deployFixture();
      const askPrice = ethers.parseEther("10");

      await collection.connect(owner).approve(await salesMarketplace.getAddress(), 1n);

      await expect(salesMarketplace.connect(owner).createFixedPriceListing(1n, askPrice, startDate))
        .to.emit(salesMarketplace, "FixedPriceListingCreated")
        .withArgs(1n, 1n, owner.address, askPrice, startDate);

      const listing = await salesMarketplace.getListing(1n);
      expect(listing.seller).to.equal(owner.address);
      expect(listing.price).to.equal(askPrice);
      expect(listing.effectiveStartDate).to.equal(startDate);
      expect(listing.listingType).to.equal(0n);
      expect(listing.status).to.equal(0n);
    });

    it("rejects listing without approval", async function () {
      const { salesMarketplace, owner, startDate } = await deployFixture();
      const askPrice = ethers.parseEther("10");

      await expect(
        salesMarketplace.connect(owner).createFixedPriceListing(1n, askPrice, startDate),
      ).to.be.revertedWithCustomError(salesMarketplace, "NotApprovedForTransfer");
    });

    it("allows buying fixed-price listing", async function () {
      const { salesMarketplace, subscriptionNFT, collection, owner, buyer, deployer, startDate } =
        await deployFixture();
      const askPrice = ethers.parseEther("10");

      await collection.connect(owner).approve(await salesMarketplace.getAddress(), 1n);
      await salesMarketplace.connect(owner).createFixedPriceListing(1n, askPrice, startDate);

      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      const providerBalanceBefore = await ethers.provider.getBalance(deployer.address);

      await expect(salesMarketplace.connect(buyer).buy(1n, { value: askPrice })).to.emit(
        salesMarketplace,
        "ListingSold",
      );

      expect(await subscriptionNFT.currentOwner(1n)).to.equal(buyer.address);

      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      const expectedSellerProceeds = (askPrice * 9000n) / 10000n;
      expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(expectedSellerProceeds);

      const providerBalanceAfter = await ethers.provider.getBalance(deployer.address);
      const expectedProviderFee = (askPrice * 500n) / 10000n;
      expect(providerBalanceAfter - providerBalanceBefore).to.equal(expectedProviderFee);
    });

    it("rejects incorrect payment", async function () {
      const { salesMarketplace, collection, owner, buyer, startDate } = await deployFixture();
      const askPrice = ethers.parseEther("10");

      await collection.connect(owner).approve(await salesMarketplace.getAddress(), 1n);
      await salesMarketplace.connect(owner).createFixedPriceListing(1n, askPrice, startDate);

      await expect(
        salesMarketplace.connect(buyer).buy(1n, { value: ethers.parseEther("5") }),
      ).to.be.revertedWithCustomError(salesMarketplace, "IncorrectPayment");
    });

    it("allows cancelling fixed-price listing", async function () {
      const { salesMarketplace, collection, owner, startDate } = await deployFixture();
      const askPrice = ethers.parseEther("10");

      await collection.connect(owner).approve(await salesMarketplace.getAddress(), 1n);
      await salesMarketplace.connect(owner).createFixedPriceListing(1n, askPrice, startDate);

      await expect(salesMarketplace.connect(owner).cancelListing(1n))
        .to.emit(salesMarketplace, "ListingCancelled")
        .withArgs(1n, owner.address);

      const listing = await salesMarketplace.getListing(1n);
      expect(listing.status).to.equal(2n);
    });

    it("rejects invalid effective start date", async function () {
      const { salesMarketplace, collection, owner, endDate } = await deployFixture();
      const askPrice = ethers.parseEther("10");

      await collection.connect(owner).approve(await salesMarketplace.getAddress(), 1n);

      await expect(
        salesMarketplace.connect(owner).createFixedPriceListing(1n, askPrice, endDate + 1n),
      ).to.be.revertedWithCustomError(salesMarketplace, "InvalidEffectiveStartDate");
    });
  });

  describe("Auction Listings", function () {
    it("creates auction listing", async function () {
      const { salesMarketplace, collection, owner, startDate } = await deployFixture();
      const reservePrice = ethers.parseEther("5");

      await collection.connect(owner).approve(await salesMarketplace.getAddress(), 1n);

      await expect(salesMarketplace.connect(owner).createAuction(1n, reservePrice, startDate)).to.emit(
        salesMarketplace,
        "AuctionCreated",
      );

      const listing = await salesMarketplace.getListing(1n);
      expect(listing.listingType).to.equal(1n);
      expect(listing.price).to.equal(reservePrice);
      expect(listing.effectiveStartDate).to.equal(startDate);
      expect(listing.auctionEndTime).to.be.gt(0n);
    });

    it("accepts bids above reserve price", async function () {
      const { salesMarketplace, collection, owner, bidderA, startDate } = await deployFixture();
      const reservePrice = ethers.parseEther("5");

      await collection.connect(owner).approve(await salesMarketplace.getAddress(), 1n);
      await salesMarketplace.connect(owner).createAuction(1n, reservePrice, startDate);

      await expect(salesMarketplace.connect(bidderA).bid(1n, { value: reservePrice }))
        .to.emit(salesMarketplace, "BidPlaced")
        .withArgs(1n, bidderA.address, reservePrice, ethers.ZeroAddress, 0n);

      const listing = await salesMarketplace.getListing(1n);
      expect(listing.highestBidder).to.equal(bidderA.address);
      expect(listing.highestBid).to.equal(reservePrice);
    });

    it("refunds previous bidder when outbid", async function () {
      const { salesMarketplace, collection, owner, bidderA, bidderB, startDate } = await deployFixture();
      const reservePrice = ethers.parseEther("5");

      await collection.connect(owner).approve(await salesMarketplace.getAddress(), 1n);
      await salesMarketplace.connect(owner).createAuction(1n, reservePrice, startDate);

      await salesMarketplace.connect(bidderA).bid(1n, { value: reservePrice });

      const bidderABalanceBefore = await ethers.provider.getBalance(bidderA.address);

      const higherBid = ethers.parseEther("6");
      await expect(salesMarketplace.connect(bidderB).bid(1n, { value: higherBid }))
        .to.emit(salesMarketplace, "BidPlaced")
        .withArgs(1n, bidderB.address, higherBid, bidderA.address, reservePrice);

      const bidderABalanceAfter = await ethers.provider.getBalance(bidderA.address);
      expect(bidderABalanceAfter - bidderABalanceBefore).to.equal(reservePrice);
    });

    it("rejects bid below minimum", async function () {
      const { salesMarketplace, collection, owner, bidderA, bidderB, startDate } = await deployFixture();
      const reservePrice = ethers.parseEther("5");

      await collection.connect(owner).approve(await salesMarketplace.getAddress(), 1n);
      await salesMarketplace.connect(owner).createAuction(1n, reservePrice, startDate);

      await salesMarketplace.connect(bidderA).bid(1n, { value: reservePrice });

      await expect(salesMarketplace.connect(bidderB).bid(1n, { value: reservePrice })).to.be.revertedWithCustomError(
        salesMarketplace,
        "BidTooLow",
      );
    });

    it("settles auction and transfers NFT to winner", async function () {
      const { salesMarketplace, subscriptionNFT, collection, owner, bidderA, bidderB, deployer, startDate } =
        await deployFixture();
      const reservePrice = ethers.parseEther("5");

      await collection.connect(owner).approve(await salesMarketplace.getAddress(), 1n);
      await salesMarketplace.connect(owner).createAuction(1n, reservePrice, startDate);

      await salesMarketplace.connect(bidderA).bid(1n, { value: reservePrice });

      await ethers.provider.send("evm_increaseTime", [3 * DAY + 1]);
      await ethers.provider.send("evm_mine", []);

      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      const providerBalanceBefore = await ethers.provider.getBalance(deployer.address);

      // Use bidderB to settle so gas cost doesn't affect deployer (provider) balance check
      await expect(salesMarketplace.connect(bidderB).settleAuction(1n)).to.emit(salesMarketplace, "ListingSold");

      expect(await subscriptionNFT.currentOwner(1n)).to.equal(bidderA.address);

      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      const expectedSellerProceeds = (reservePrice * 9000n) / 10000n;
      expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(expectedSellerProceeds);

      const providerBalanceAfter = await ethers.provider.getBalance(deployer.address);
      const expectedProviderFee = (reservePrice * 500n) / 10000n;
      expect(providerBalanceAfter - providerBalanceBefore).to.equal(expectedProviderFee);
    });

    it("cancels auction with no bids after end time", async function () {
      const { salesMarketplace, collection, owner, startDate } = await deployFixture();
      const reservePrice = ethers.parseEther("5");

      await collection.connect(owner).approve(await salesMarketplace.getAddress(), 1n);
      await salesMarketplace.connect(owner).createAuction(1n, reservePrice, startDate);

      await ethers.provider.send("evm_increaseTime", [3 * DAY + 1]);
      await ethers.provider.send("evm_mine", []);

      await expect(salesMarketplace.settleAuction(1n)).to.emit(salesMarketplace, "ListingCancelled");

      const listing = await salesMarketplace.getListing(1n);
      expect(listing.status).to.equal(2n);
    });

    it("rejects cancellation when auction has bids", async function () {
      const { salesMarketplace, collection, owner, bidderA, startDate } = await deployFixture();
      const reservePrice = ethers.parseEther("5");

      await collection.connect(owner).approve(await salesMarketplace.getAddress(), 1n);
      await salesMarketplace.connect(owner).createAuction(1n, reservePrice, startDate);

      await salesMarketplace.connect(bidderA).bid(1n, { value: reservePrice });

      await expect(salesMarketplace.connect(owner).cancelListing(1n)).to.be.revertedWithCustomError(
        salesMarketplace,
        "AuctionHasBids",
      );
    });

    it("rejects settlement before auction ends", async function () {
      const { salesMarketplace, collection, owner, bidderA, startDate } = await deployFixture();
      const reservePrice = ethers.parseEther("5");

      await collection.connect(owner).approve(await salesMarketplace.getAddress(), 1n);
      await salesMarketplace.connect(owner).createAuction(1n, reservePrice, startDate);

      await salesMarketplace.connect(bidderA).bid(1n, { value: reservePrice });

      await expect(salesMarketplace.settleAuction(1n)).to.be.revertedWithCustomError(
        salesMarketplace,
        "AuctionNotEnded",
      );
    });
  });

  describe("Future Bookings Check", function () {
    it("rejects listing when subscription has future bookings", async function () {
      const { salesMarketplace, rentalMarketplace, collection, owner, buyer, startDate } = await deployFixture();

      const windowStart = startDate + 10n * BigInt(DAY);
      const windowEnd = windowStart + 20n * BigInt(DAY);
      const pricePerDay = ethers.parseEther("0.1");

      await rentalMarketplace.connect(owner).createAvailability(1n, windowStart, windowEnd, pricePerDay);
      await rentalMarketplace.connect(buyer).book(1n, windowStart, 5n, { value: pricePerDay * 5n });

      await collection.connect(owner).approve(await salesMarketplace.getAddress(), 1n);

      await expect(
        salesMarketplace.connect(owner).createFixedPriceListing(1n, ethers.parseEther("10"), startDate),
      ).to.be.revertedWithCustomError(salesMarketplace, "HasActiveFutureBookings");
    });
  });

  describe("Access Control", function () {
    it("rejects listing from non-owner", async function () {
      const { salesMarketplace, buyer, startDate } = await deployFixture();

      await expect(
        salesMarketplace.connect(buyer).createFixedPriceListing(1n, ethers.parseEther("10"), startDate),
      ).to.be.revertedWithCustomError(salesMarketplace, "NotCurrentOwner");
    });

    it("rejects cancel from non-seller", async function () {
      const { salesMarketplace, collection, owner, buyer, startDate } = await deployFixture();

      await collection.connect(owner).approve(await salesMarketplace.getAddress(), 1n);
      await salesMarketplace.connect(owner).createFixedPriceListing(1n, ethers.parseEther("10"), startDate);

      await expect(salesMarketplace.connect(buyer).cancelListing(1n)).to.be.revertedWithCustomError(
        salesMarketplace,
        "NotSeller",
      );
    });

    it("rejects duplicate listing", async function () {
      const { salesMarketplace, collection, owner, startDate } = await deployFixture();

      await collection.connect(owner).approve(await salesMarketplace.getAddress(), 1n);
      await salesMarketplace.connect(owner).createFixedPriceListing(1n, ethers.parseEther("10"), startDate);

      await expect(
        salesMarketplace.connect(owner).createAuction(1n, ethers.parseEther("5"), startDate),
      ).to.be.revertedWithCustomError(salesMarketplace, "AlreadyListed");
    });
  });

  describe("Fee Withdrawal", function () {
    it("allows owner to withdraw marketplace fees", async function () {
      const { salesMarketplace, collection, owner, buyer, deployer, startDate } = await deployFixture();
      const askPrice = ethers.parseEther("10");

      await collection.connect(owner).approve(await salesMarketplace.getAddress(), 1n);
      await salesMarketplace.connect(owner).createFixedPriceListing(1n, askPrice, startDate);
      await salesMarketplace.connect(buyer).buy(1n, { value: askPrice });

      const expectedFees = (askPrice * 500n) / 10000n;
      expect(await salesMarketplace.accruedMarketplaceFees()).to.equal(expectedFees);

      const recipientBalanceBefore = await ethers.provider.getBalance(deployer.address);

      await expect(salesMarketplace.connect(deployer).withdrawMarketplaceFees(deployer.address))
        .to.emit(salesMarketplace, "MarketplaceFeesWithdrawn")
        .withArgs(deployer.address, expectedFees);

      const recipientBalanceAfter = await ethers.provider.getBalance(deployer.address);
      expect(recipientBalanceAfter).to.be.gt(recipientBalanceBefore);
    });
  });
});
