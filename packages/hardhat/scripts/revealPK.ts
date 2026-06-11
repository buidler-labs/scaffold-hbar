import * as dotenv from "dotenv";
dotenv.config();
import { decryptKey } from "./utils/decryptKey";

async function main() {
  const hederaEncryptedKey = process.env.HEDERA_DEPLOYER_PRIVATE_KEY_ENCRYPTED;
  const ethEncryptedKey = process.env.ETH_DEPLOYER_PRIVATE_KEY_ENCRYPTED;

  if (!hederaEncryptedKey && !ethEncryptedKey) {
    console.log("🚫️ You don't have any deployer accounts. Run `yarn account:generate` or `yarn account:import` first");
    return;
  }

  console.log("👀 This will reveal your private key(s) on the console.\n");

  if (hederaEncryptedKey) {
    const wallet = await decryptKey(hederaEncryptedKey, "Hedera");
    console.log("\n🔑 Hedera private key:", wallet.privateKey);
  } else {
    console.log("⚠️  No Hedera deployer account found.");
  }

  if (ethEncryptedKey) {
    const wallet = await decryptKey(ethEncryptedKey, "ETH");
    console.log("\n🔑 ETH private key:", wallet.privateKey);
  } else {
    console.log("⚠️  No ETH deployer account found.");
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
