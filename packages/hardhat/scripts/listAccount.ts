import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "ethers";
import QRCode from "qrcode";
import { config } from "hardhat";
import { decryptKey } from "./utils/decryptKey";

const HEDERA_CHAIN_IDS = new Set([295, 296]);
const ETH_CHAIN_IDS = new Set([11155111]);

async function showAccountInfo(encryptedKey: string, chain: "Hedera" | "ETH", networkFilter: Set<number>) {
  const wallet = await decryptKey(encryptedKey, chain);
  const address = wallet.address;

  console.log(`\n${"=".repeat(50)}`);
  console.log(`${chain} Account`);
  console.log("=".repeat(50));
  console.log(await QRCode.toString(address, { type: "terminal", small: true }));
  console.log("Public address:", address, "\n");

  const availableNetworks = config.networks;
  for (const networkName in availableNetworks) {
    try {
      const network = availableNetworks[networkName];
      if (!("url" in network)) continue;
      if (network.chainId && !networkFilter.has(network.chainId)) continue;
      const provider = new ethers.JsonRpcProvider(network.url);
      await provider._detectNetwork();
      const balance = await provider.getBalance(address);
      console.log("--", networkName, "-- 📡");
      console.log("   balance:", +ethers.formatEther(balance));
      console.log("   nonce:", +(await provider.getTransactionCount(address)));
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      console.log("Can't connect to network", networkName);
    }
  }
}

async function main() {
  const hederaEncryptedKey = process.env.HEDERA_DEPLOYER_PRIVATE_KEY_ENCRYPTED;
  const ethEncryptedKey = process.env.ETH_DEPLOYER_PRIVATE_KEY_ENCRYPTED;

  if (!hederaEncryptedKey && !ethEncryptedKey) {
    console.log("🚫️ You don't have any deployer accounts. Run `yarn account:generate` or `yarn account:import` first");
    return;
  }

  if (hederaEncryptedKey) {
    await showAccountInfo(hederaEncryptedKey, "Hedera", HEDERA_CHAIN_IDS);
  } else {
    console.log("\n⚠️  No Hedera deployer account found. Run `yarn account:generate` to create one.");
  }

  if (ethEncryptedKey) {
    await showAccountInfo(ethEncryptedKey, "ETH", ETH_CHAIN_IDS);
  } else {
    console.log("\n⚠️  No ETH deployer account found. Run `yarn account:generate` to create one.");
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
