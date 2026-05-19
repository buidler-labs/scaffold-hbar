import * as dotenv from "dotenv";
dotenv.config();
import { ethers, Wallet, Interface } from "ethers";
import password from "@inquirer/password";

async function main() {
  const nftAddress = "0x5B614Bf80Cb3841F9553b019F81135Ec1A58Ff8F";
  const rpcUrl = "https://testnet.hashio.io/api";

  // Decrypt the deployer key
  const encryptedKey = process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED;
  if (!encryptedKey) {
    console.log("🚫️ No deployer account found. Run `yarn account:generate` first");
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

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = wallet.connect(provider);

  console.log("Creating collection with account:", signer.address);

  const balance = await provider.getBalance(signer.address);
  console.log("Account balance:", ethers.formatEther(balance), "HBAR");

  // Full ABI for SubscriptionNFT
  const abi = [
    {
      inputs: [
        { internalType: "string", name: "name", type: "string" },
        { internalType: "string", name: "symbol", type: "string" },
        { internalType: "string", name: "memo", type: "string" },
      ],
      name: "createCollection",
      outputs: [{ internalType: "address", name: "createdAddress", type: "address" }],
      stateMutability: "payable",
      type: "function",
    },
    {
      inputs: [],
      name: "collectionAddress",
      outputs: [{ internalType: "address", name: "", type: "address" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "owner",
      outputs: [{ internalType: "address", name: "", type: "address" }],
      stateMutability: "view",
      type: "function",
    },
  ];

  const nft = new ethers.Contract(nftAddress, abi, signer);

  // Check current owner
  const owner = await nft.owner();
  console.log("Contract owner:", owner);
  console.log("Caller address:", signer.address);

  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    console.error("❌ You are not the contract owner! Only owner can create collection.");
    process.exit(1);
  }

  // Check if collection already exists
  const existingCollection = await nft.collectionAddress();
  if (existingCollection !== ethers.ZeroAddress) {
    console.log("✅ Collection already exists at:", existingCollection);
    return;
  }

  // Encode the function call to verify
  const iface = new Interface(abi);
  const calldata = iface.encodeFunctionData("createCollection", [
    "SubRent NFT",
    "SRENT",
    "Subscription rental marketplace",
  ]);
  console.log("Encoded calldata:", calldata.substring(0, 50) + "...");

  // Send with 40 HBAR to cover increased HTS fees
  const hbarToSend = "40";
  console.log(`Calling createCollection with ${hbarToSend} HBAR...`);

  const tx = await nft.createCollection("SubRent NFT", "SRENT", "Subscription rental marketplace", {
    value: ethers.parseEther(hbarToSend),
    gasLimit: 1_500_000,
  });

  console.log("Transaction hash:", tx.hash);
  console.log("View on Hashscan: https://hashscan.io/testnet/transaction/" + tx.hash);
  console.log("Waiting for confirmation...");

  const receipt = await tx.wait();
  console.log("Transaction confirmed in block:", receipt?.blockNumber);
  console.log("Gas used:", receipt?.gasUsed?.toString());

  const collectionAddress = await nft.collectionAddress();
  console.log("✅ HTS Collection created at:", collectionAddress);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
