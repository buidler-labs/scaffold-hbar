import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const deployedPath = path.resolve(__dirname, "../../config/deployed-addresses.json");
  if (!fs.existsSync(deployedPath)) throw new Error("config/deployed-addresses.json not found — run deploy.ts first");

  const deployed = JSON.parse(fs.readFileSync(deployedPath, "utf8"));
  const bridgeSenderAddr = deployed.hederaMessageSender;
  if (!bridgeSenderAddr) throw new Error("hederaMessageSender not found in deployed-addresses.json");

  const GAS = { gasLimit: 4_000_000n, gasPrice: 1_200_000_000_000n } as const;

  const bridgeSender = await ethers.getContractAt("AxelarMessageSender", bridgeSenderAddr);
  const [owner] = await ethers.getSigners();

  const balanceBefore = await ethers.provider.getBalance(bridgeSenderAddr);
  console.log("=== Withdrawing from AxelarMessageSender ===");
  console.log("  Bridge sender: ", bridgeSenderAddr);
  console.log("  Owner:         ", owner.address);
  console.log("  Balance:       ", ethers.formatEther(balanceBefore), "HBAR");

  const tx = await bridgeSender.withdraw(GAS);
  console.log("\nTransaction submitted:", tx.hash);
  await tx.wait();

  const balanceAfter = await ethers.provider.getBalance(bridgeSenderAddr);
  console.log("\n✅ Withdrawal complete!");
  console.log("  Contract balance after: ", ethers.formatEther(balanceAfter), "HBAR");
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
