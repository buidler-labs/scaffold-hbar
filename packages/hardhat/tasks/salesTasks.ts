import { task, types } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

task("sales:list-fixed", "Create a fixed-price sale listing")
  .addParam("serial", "Subscription NFT serial number", undefined, types.int)
  .addParam("price", "Asking price in HBAR", undefined, types.string)
  .addOptionalParam("startDate", "Effective start date (Unix timestamp). Defaults to today.", undefined, types.int)
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { deployer } = await hre.getNamedAccounts();
    const salesMarketplace = (await hre.ethers.getContract("SubscriptionSalesMarketplace", deployer)) as any;
    const subscriptionNFT = (await hre.ethers.getContract("SubscriptionNFT", deployer)) as any;

    const serialNumber = taskArgs.serial;
    const priceInWei = hre.ethers.parseEther(taskArgs.price);

    // Default to today at midnight UTC
    const DAY = 24 * 60 * 60;
    const now = Math.floor(Date.now() / 1000);
    const todayAligned = now - (now % DAY);
    const effectiveStartDate = taskArgs.startDate ? taskArgs.startDate : todayAligned;

    console.log(`Creating fixed-price listing for serial #${serialNumber} at ${taskArgs.price} HBAR...`);
    console.log(`Effective start date: ${new Date(effectiveStartDate * 1000).toISOString()}`);

    const collectionAddress = await subscriptionNFT.collectionAddress();
    const nftContract = (await hre.ethers.getContractAt(
      "IERC721",
      collectionAddress,
      await hre.ethers.getSigner(deployer),
    )) as any;

    const approved = await nftContract.getApproved(serialNumber);
    if (approved !== (await salesMarketplace.getAddress())) {
      console.log("Approving sales marketplace for NFT transfer...");
      const approveTx = await nftContract.approve(await salesMarketplace.getAddress(), serialNumber);
      await approveTx.wait();
    }

    const tx = await salesMarketplace.createFixedPriceListing(serialNumber, priceInWei, effectiveStartDate);
    const receipt = await tx.wait();

    console.log(`Fixed-price listing created! TX: ${receipt?.hash}`);
  });

task("sales:list-auction", "Create an auction listing")
  .addParam("serial", "Subscription NFT serial number", undefined, types.int)
  .addParam("reserve", "Reserve price in HBAR", undefined, types.string)
  .addOptionalParam("startDate", "Effective start date (Unix timestamp). Defaults to today.", undefined, types.int)
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { deployer } = await hre.getNamedAccounts();
    const salesMarketplace = (await hre.ethers.getContract("SubscriptionSalesMarketplace", deployer)) as any;
    const subscriptionNFT = (await hre.ethers.getContract("SubscriptionNFT", deployer)) as any;

    const serialNumber = taskArgs.serial;
    const reserveInWei = hre.ethers.parseEther(taskArgs.reserve);

    // Default to today at midnight UTC
    const DAY = 24 * 60 * 60;
    const now = Math.floor(Date.now() / 1000);
    const todayAligned = now - (now % DAY);
    const effectiveStartDate = taskArgs.startDate ? taskArgs.startDate : todayAligned;

    console.log(`Creating auction for serial #${serialNumber} with reserve ${taskArgs.reserve} HBAR...`);
    console.log(`Effective start date: ${new Date(effectiveStartDate * 1000).toISOString()}`);

    const collectionAddress = await subscriptionNFT.collectionAddress();
    const nftContract = (await hre.ethers.getContractAt(
      "IERC721",
      collectionAddress,
      await hre.ethers.getSigner(deployer),
    )) as any;

    const approved = await nftContract.getApproved(serialNumber);
    if (approved !== (await salesMarketplace.getAddress())) {
      console.log("Approving sales marketplace for NFT transfer...");
      const approveTx = await nftContract.approve(await salesMarketplace.getAddress(), serialNumber);
      await approveTx.wait();
    }

    const tx = await salesMarketplace.createAuction(serialNumber, reserveInWei, effectiveStartDate);
    const receipt = await tx.wait();

    console.log(`Auction created! TX: ${receipt?.hash}`);
  });

task("sales:buy", "Buy a fixed-price listing")
  .addParam("listing", "Listing ID", undefined, types.int)
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { deployer } = await hre.getNamedAccounts();
    const salesMarketplace = (await hre.ethers.getContract("SubscriptionSalesMarketplace", deployer)) as any;

    const listingId = taskArgs.listing;
    const listing = await salesMarketplace.getListing(listingId);

    console.log(`Buying listing #${listingId} for ${hre.ethers.formatEther(listing.price)} HBAR...`);

    const tx = await salesMarketplace.buy(listingId, { value: listing.price });
    const receipt = await tx.wait();

    console.log(`Purchase complete! TX: ${receipt?.hash}`);
  });

task("sales:bid", "Place a bid on an auction")
  .addParam("listing", "Listing ID", undefined, types.int)
  .addParam("amount", "Bid amount in HBAR", undefined, types.string)
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { deployer } = await hre.getNamedAccounts();
    const salesMarketplace = (await hre.ethers.getContract("SubscriptionSalesMarketplace", deployer)) as any;

    const listingId = taskArgs.listing;
    const bidInWei = hre.ethers.parseEther(taskArgs.amount);

    console.log(`Placing bid of ${taskArgs.amount} HBAR on listing #${listingId}...`);

    const tx = await salesMarketplace.bid(listingId, { value: bidInWei });
    const receipt = await tx.wait();

    console.log(`Bid placed! TX: ${receipt?.hash}`);
  });

task("sales:settle", "Settle an ended auction")
  .addParam("listing", "Listing ID", undefined, types.int)
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { deployer } = await hre.getNamedAccounts();
    const salesMarketplace = (await hre.ethers.getContract("SubscriptionSalesMarketplace", deployer)) as any;

    const listingId = taskArgs.listing;

    console.log(`Settling auction #${listingId}...`);

    const tx = await salesMarketplace.settleAuction(listingId);
    const receipt = await tx.wait();

    console.log(`Auction settled! TX: ${receipt?.hash}`);
  });

task("sales:cancel", "Cancel a listing")
  .addParam("listing", "Listing ID", undefined, types.int)
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { deployer } = await hre.getNamedAccounts();
    const salesMarketplace = (await hre.ethers.getContract("SubscriptionSalesMarketplace", deployer)) as any;

    const listingId = taskArgs.listing;

    console.log(`Cancelling listing #${listingId}...`);

    const tx = await salesMarketplace.cancelListing(listingId);
    const receipt = await tx.wait();

    console.log(`Listing cancelled! TX: ${receipt?.hash}`);
  });

task("sales:info", "Get listing information")
  .addParam("listing", "Listing ID", undefined, types.int)
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const salesMarketplace = (await hre.ethers.getContract("SubscriptionSalesMarketplace")) as any;

    const listingId = taskArgs.listing;
    const listing = await salesMarketplace.getListing(listingId);

    const listingTypeNames = ["FixedPrice", "Auction"];
    const statusNames = ["Active", "Sold", "Cancelled"];

    console.log("\n=== Listing Info ===");
    console.log(`ID: ${listing.id}`);
    console.log(`Serial Number: ${listing.serialNumber}`);
    console.log(`Seller: ${listing.seller}`);
    console.log(`Type: ${listingTypeNames[Number(listing.listingType)]}`);
    console.log(`Status: ${statusNames[Number(listing.status)]}`);
    console.log(`Price: ${hre.ethers.formatEther(listing.price)} HBAR`);
    console.log(`Effective Start: ${new Date(Number(listing.effectiveStartDate) * 1000).toISOString()}`);

    if (listing.listingType === 1n) {
      console.log(`Auction End: ${new Date(Number(listing.auctionEndTime) * 1000).toISOString()}`);
      console.log(`Highest Bidder: ${listing.highestBidder}`);
      console.log(`Highest Bid: ${hre.ethers.formatEther(listing.highestBid)} HBAR`);

      const minBid = await salesMarketplace.getMinimumBid(listingId);
      console.log(`Minimum Bid: ${hre.ethers.formatEther(minBid)} HBAR`);
    }
  });

task("sales:list-all", "List all sale listings").setAction(async (_, hre: HardhatRuntimeEnvironment) => {
  const salesMarketplace = (await hre.ethers.getContract("SubscriptionSalesMarketplace")) as any;
  const nextListingId = await salesMarketplace.nextListingId();

  const listingTypeNames = ["FixedPrice", "Auction"];
  const statusNames = ["Active", "Sold", "Cancelled"];

  console.log("\n=== All Sale Listings ===");

  for (let i = 1n; i < nextListingId; i++) {
    try {
      const listing = await salesMarketplace.getListing(i);
      console.log(`\n#${listing.id} - Serial ${listing.serialNumber}`);
      console.log(`  Type: ${listingTypeNames[Number(listing.listingType)]}`);
      console.log(`  Status: ${statusNames[Number(listing.status)]}`);
      console.log(`  Price: ${hre.ethers.formatEther(listing.price)} HBAR`);
      if (listing.listingType === 1n && listing.highestBid > 0n) {
        console.log(`  Current Bid: ${hre.ethers.formatEther(listing.highestBid)} HBAR`);
      }
    } catch {
      continue;
    }
  }
});
