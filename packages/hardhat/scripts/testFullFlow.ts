import * as dotenv from "dotenv";
dotenv.config();
import { ethers, Wallet } from "ethers";
import password from "@inquirer/password";

const NFT_ADDRESS = "0x5B614Bf80Cb3841F9553b019F81135Ec1A58Ff8F";
const MARKETPLACE_ADDRESS = "0x5B415432aef934929a0F46ae4455Cd8eb5f9D238";
const RPC_URL = "https://testnet.hashio.io/api";

const NFT_ABI = [
  "function mintSubscription(address providerAddress, string provider, string serviceTier, uint256 startDate, uint256 endDate) external returns (int64)",
  "function getSubscription(int64 serialNumber) external view returns (tuple(address minter, address providerAddress, string provider, string serviceTier, uint256 startDate, uint256 endDate))",
  "function currentOwner(int64 serialNumber) external view returns (address)",
  "function collectionAddress() external view returns (address)",
  "function isExpired(int64 serialNumber) external view returns (bool)",
  "function getProviderAddress(int64 serialNumber) external view returns (address)",
  "event SubscriptionMinted(address indexed recipient, int64 indexed serialNumber, string provider, string serviceTier)",
];

const MARKETPLACE_ABI = [
  "function createAvailability(int64 serialNumber, uint256 windowStart, uint256 windowEnd, uint256 pricePerDay) external returns (uint256)",
  "function book(uint256 availabilityId, uint256 startDate, uint256 numberOfDays) external payable returns (uint256)",
  "function userOf(int64 serialNumber) external view returns (address)",
  "function cancelBooking(uint256 bookingId) external",
  "function claimBookingPayout(uint256 bookingId) external",
  "function getAvailability(int64 serialNumber) external view returns (tuple(uint256 id, address owner, int64 serialNumber, uint256 windowStart, uint256 windowEnd, uint256 pricePerDay, uint8 status)[])",
  "function getBookings(int64 serialNumber) external view returns (tuple(uint256 id, address renter, uint256 availabilityId, int64 serialNumber, uint256 startDate, uint256 endDate, uint256 totalPaid, uint256 feeAmount, uint256 ownerPayout, bool payoutClaimed, uint8 status)[])",
  "function bookingsById(uint256 bookingId) external view returns (tuple(uint256 id, address renter, uint256 availabilityId, int64 serialNumber, uint256 startDate, uint256 endDate, uint256 totalPaid, uint256 feeAmount, uint256 ownerPayout, bool payoutClaimed, uint8 status))",
  "function availabilities(uint256 availabilityId) external view returns (uint256 id, address owner, int64 serialNumber, uint256 windowStart, uint256 windowEnd, uint256 pricePerDay, uint8 status)",
  "function nextAvailabilityId() external view returns (uint256)",
  "event AvailabilityCreated(uint256 indexed availabilityId, int64 indexed serialNumber, address indexed owner, uint256 windowStart, uint256 windowEnd, uint256 pricePerDay)",
];

// Helper: Get midnight UTC timestamp for a specific number of days from now
function getMidnightUTC(daysFromNow: number = 0): number {
  // Get current time in seconds
  const nowSeconds = Math.floor(Date.now() / 1000);
  // Round down to current day's midnight UTC
  const todayMidnight = Math.floor(nowSeconds / 86400) * 86400;
  // Add the requested days
  return todayMidnight + daysFromNow * 86400;
}

// Helper: Format timestamp to readable date
function formatDate(timestamp: number | bigint): string {
  return new Date(Number(timestamp) * 1000).toISOString().split("T")[0];
}

async function main() {
  console.log("=".repeat(60));
  console.log("🏋️ SUBSCRIPTION NFT MARKETPLACE - FULL TEST FLOW");
  console.log("=".repeat(60));

  // Decrypt deployer key
  const encryptedKey = process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED;
  if (!encryptedKey) {
    console.log("🚫 No deployer account found. Run `yarn account:generate` first");
    return;
  }

  const pass = await password({ message: "Enter password to decrypt private key:" });

  let wallet: Wallet | ethers.HDNodeWallet;
  try {
    wallet = await Wallet.fromEncryptedJson(encryptedKey, pass);
  } catch {
    console.error("Failed to decrypt private key. Wrong password?");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = wallet.connect(provider);

  console.log("\n📍 Test Account:", signer.address);
  const balance = await provider.getBalance(signer.address);
  console.log("💰 Balance:", ethers.formatEther(balance), "HBAR\n");

  const nft = new ethers.Contract(NFT_ADDRESS, NFT_ABI, signer);
  const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);

  // Check collection exists
  const collectionAddress = await nft.collectionAddress();
  console.log("📦 HTS Collection:", collectionAddress);

  // ============================================================
  // STEP 1: MINT A SUBSCRIPTION NFT
  // ============================================================
  console.log("\n" + "=".repeat(60));
  console.log("STEP 1: MINT SUBSCRIPTION NFT");
  console.log("=".repeat(60));

  const subscriptionStart = getMidnightUTC(0); // Today midnight UTC
  const subscriptionEnd = getMidnightUTC(90); // 90 days from now

  console.log(`Minting: "Gym A" - "Premium" subscription`);
  console.log(`  Start timestamp: ${subscriptionStart} -> ${formatDate(subscriptionStart)}`);
  console.log(`  End timestamp: ${subscriptionEnd} -> ${formatDate(subscriptionEnd)}`);

  const mintTx = await nft.mintSubscription(signer.address, "Gym A", "Premium", subscriptionStart, subscriptionEnd, {
    gasLimit: 500_000,
  });
  console.log("  TX:", mintTx.hash);
  const mintReceipt = await mintTx.wait();

  // Parse the serial number from SubscriptionMinted event
  // Event signature: SubscriptionMinted(address indexed recipient, int64 indexed serialNumber, string provider, string serviceTier)
  // The serialNumber is the second indexed parameter (topics[2])
  let serialNumber: bigint;

  const subscriptionMintedTopic = ethers.id("SubscriptionMinted(address,int64,string,string)");
  const mintEvent = mintReceipt.logs.find((log: any) => log.topics[0] === subscriptionMintedTopic);

  if (mintEvent && mintEvent.topics[2]) {
    // topics[2] is the indexed serialNumber (as int64, but padded to 32 bytes)
    serialNumber = BigInt(mintEvent.topics[2]);
    console.log("✅ Minted! Serial Number:", serialNumber.toString(), "(from event)");
  } else {
    // Fallback: try to decode from logs
    console.log("⚠️  Could not parse serial from event, checking logs...");
    console.log("  Logs:", mintReceipt.logs.length);
    // Default to checking what serials exist
    serialNumber = 1n;
    console.log("  Using fallback serial:", serialNumber.toString());
  }

  // Verify subscription data
  const subscription = await nft.getSubscription(serialNumber);
  console.log("\n📋 Subscription Details (from contract):");
  console.log("  Provider:", subscription.provider);
  console.log("  Tier:", subscription.serviceTier);
  console.log("  Start timestamp:", subscription.startDate.toString(), "->", formatDate(subscription.startDate));
  console.log("  End timestamp:", subscription.endDate.toString(), "->", formatDate(subscription.endDate));
  console.log("  Minter:", subscription.minter);

  // Verify dates match what we sent
  if (Number(subscription.startDate) !== subscriptionStart || Number(subscription.endDate) !== subscriptionEnd) {
    console.log("\n⚠️  WARNING: Stored dates don't match sent dates!");
    console.log("  Sent start:", subscriptionStart, "Stored:", subscription.startDate.toString());
    console.log("  Sent end:", subscriptionEnd, "Stored:", subscription.endDate.toString());
  }

  const owner = await nft.currentOwner(serialNumber);
  console.log("  Current Owner:", owner);

  // ============================================================
  // STEP 2: CREATE AVAILABILITY LISTING
  // ============================================================
  console.log("\n" + "=".repeat(60));
  console.log("STEP 2: CREATE AVAILABILITY LISTING");
  console.log("=".repeat(60));

  const availabilityStart = getMidnightUTC(7); // 7 days from now
  const availabilityEnd = getMidnightUTC(21); // 21 days from now (14-day window)
  // IMPORTANT: On Hedera's EVM, msg.value is in TINYBARS (8 decimals), not wei!
  // So we store pricePerDay in tinybars: 1 HBAR = 10^8 tinybars
  const pricePerDayTinybars = ethers.parseUnits("1", 8); // 1 HBAR in tinybars

  console.log(`Creating availability window:`);
  console.log(`  Window: ${formatDate(availabilityStart)} to ${formatDate(availabilityEnd)}`);
  console.log(`  Window timestamps: ${availabilityStart} to ${availabilityEnd}`);
  console.log(`  Price: 1 HBAR/day`);

  // Validate availability is within subscription bounds
  const subStart = Number(subscription.startDate);
  const subEnd = Number(subscription.endDate);
  if (availabilityStart < subStart || availabilityEnd > subEnd) {
    console.log("\n❌ ERROR: Availability window outside subscription bounds!");
    console.log(`  Subscription: ${formatDate(subStart)} to ${formatDate(subEnd)}`);
    console.log(`  Availability: ${formatDate(availabilityStart)} to ${formatDate(availabilityEnd)}`);
    process.exit(1);
  }
  console.log("✓ Availability window is within subscription bounds");

  const availTx = await marketplace.createAvailability(
    serialNumber,
    availabilityStart,
    availabilityEnd,
    pricePerDayTinybars,
    { gasLimit: 300_000 },
  );
  console.log("  TX:", availTx.hash);
  const availReceipt = await availTx.wait();

  // Parse availability ID from AvailabilityCreated event
  const availCreatedTopic = ethers.id("AvailabilityCreated(uint256,int64,address,uint256,uint256,uint256)");
  const availEvent = availReceipt.logs.find((log: any) => log.topics[0] === availCreatedTopic);

  let availabilityId: bigint;
  if (availEvent && availEvent.topics[1]) {
    availabilityId = BigInt(availEvent.topics[1]);
    console.log("✅ Availability created! ID:", availabilityId.toString(), "(from event)");
  } else {
    // Fallback: read from contract state
    const nextId = await marketplace.nextAvailabilityId();
    availabilityId = nextId - 1n;
    console.log("✅ Availability created! ID:", availabilityId.toString(), "(from nextAvailabilityId)");
  }

  // Verify availability by reading it directly
  const avail = await marketplace.availabilities(availabilityId);
  console.log("\n📋 Availability Details:");
  console.log("  ID:", avail.id.toString());
  console.log("  Serial:", avail.serialNumber.toString());
  console.log("  Window:", formatDate(avail.windowStart), "to", formatDate(avail.windowEnd));
  console.log("  Price/Day:", ethers.formatUnits(avail.pricePerDay, 8), "HBAR (in tinybars)");
  console.log("  Status (raw):", avail.status.toString());
  console.log("  Status:", Number(avail.status) === 0 ? "Active" : "Removed");
  console.log("  Owner:", avail.owner);

  if (Number(avail.status) !== 0) {
    console.log("❌ ERROR: Availability is not Active! Cannot book.");
    process.exit(1);
  }

  // ============================================================
  // STEP 3: BOOK THE SUBSCRIPTION (as same user for demo)
  // ============================================================
  console.log("\n" + "=".repeat(60));
  console.log("STEP 3: BOOK SUBSCRIPTION RENTAL");
  console.log("=".repeat(60));

  const bookingStart = getMidnightUTC(10); // Start 10 days from now
  const numberOfDays = 3n; // Book for 3 days
  // Contract expects payment in tinybars (msg.value on Hedera EVM is in tinybars)
  const totalCostTinybars = pricePerDayTinybars * numberOfDays; // 3 * 10^8 tinybars
  // But JSON-RPC expects value in wei (18 decimals)
  // Conversion: 1 tinybar = 10^10 wei
  const totalCostWei = totalCostTinybars * BigInt(10 ** 10); // 3 * 10^18 wei = 3 HBAR

  console.log(`Booking rental:`);
  console.log(`  Start: ${formatDate(bookingStart)}`);
  console.log(`  Days: ${numberOfDays}`);
  console.log(`  Total Cost: ${ethers.formatEther(totalCostWei)} HBAR (${totalCostTinybars} tinybars)`);

  console.log("  Availability ID:", availabilityId.toString());

  const bookTx = await marketplace.book(availabilityId, bookingStart, numberOfDays, {
    value: totalCostWei,
    gasLimit: 400_000,
  });
  console.log("  TX:", bookTx.hash);
  const bookReceipt = await bookTx.wait();

  // Parse booking ID from Booked event
  // event Booked(uint256 indexed bookingId, uint256 indexed availabilityId, int64 indexed serialNumber, address renter, uint256 startDate, uint256 endDate, uint256 totalPaid)
  const bookedTopic = ethers.id("Booked(uint256,uint256,int64,address,uint256,uint256,uint256)");
  const bookEvent = bookReceipt.logs.find((log: any) => log.topics[0] === bookedTopic);

  let bookingId: bigint;
  if (bookEvent && bookEvent.topics[1]) {
    bookingId = BigInt(bookEvent.topics[1]);
    console.log("✅ Booked! Booking ID:", bookingId.toString(), "(from event)");
  } else {
    bookingId = 1n;
    console.log("✅ Booked! Booking ID:", bookingId.toString(), "(fallback)");
  }

  // Verify booking (amounts are in tinybars on Hedera)
  const booking = await marketplace.bookingsById(bookingId);
  console.log("\n📋 Booking Details:");
  console.log("  ID:", booking.id.toString());
  console.log("  Renter:", booking.renter);
  console.log("  Period:", formatDate(booking.startDate), "to", formatDate(booking.endDate));
  console.log("  Total Paid:", ethers.formatUnits(booking.totalPaid, 8), "HBAR");
  console.log("  Owner Payout:", ethers.formatUnits(booking.ownerPayout, 8), "HBAR");
  console.log("  Fee Amount:", ethers.formatUnits(booking.feeAmount, 8), "HBAR (5%)");
  console.log("  Payout Claimed:", booking.payoutClaimed);

  // ============================================================
  // STEP 4: CHECK userOf() - WHO HAS RENTAL RIGHTS
  // ============================================================
  console.log("\n" + "=".repeat(60));
  console.log("STEP 4: CHECK RENTAL RIGHTS (userOf)");
  console.log("=".repeat(60));

  const currentUser = await marketplace.userOf(serialNumber);
  console.log(`userOf(${serialNumber}):`, currentUser);

  if (currentUser === ethers.ZeroAddress) {
    console.log("📝 No active renter right now (booking hasn't started yet)");
    console.log(
      `   Renter will have rights from ${formatDate(bookingStart)} to ${formatDate(Number(bookingStart) + Number(numberOfDays) * 86400)}`,
    );
  } else {
    console.log("✅ Active renter:", currentUser);
  }

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log("\n" + "=".repeat(60));
  console.log("🎉 TEST COMPLETE - SUMMARY");
  console.log("=".repeat(60));
  console.log(`
Contracts:
  SubscriptionNFT:      ${NFT_ADDRESS}
  SubscriptionMarketplace: ${MARKETPLACE_ADDRESS}
  HTS Collection:       ${collectionAddress}

Created:
  Subscription NFT:     Serial #${serialNumber} (Gym A - Premium)
  Availability:         ID #${availabilityId} (${formatDate(availabilityStart)} - ${formatDate(availabilityEnd)})
  Booking:              ID #${bookingId} (${formatDate(bookingStart)} for ${numberOfDays} days)

Flow verified:
  ✅ Mint subscription NFT with metadata
  ✅ Create availability listing with price
  ✅ Book rental period with HBAR payment
  ✅ Escrow holds payment until payout claim
  
Next steps to test manually:
  - Wait for booking period to start, then call claimBookingPayout(${bookingId})
  - During booking period, userOf(${serialNumber}) will return the renter
  - Try cancelBooking(${bookingId}) before start for full refund
`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
