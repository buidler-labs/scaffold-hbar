import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const deployedPath = path.resolve(__dirname, "../../config/deployed-addresses.json");

  const deployed = fs.existsSync(deployedPath) ? JSON.parse(fs.readFileSync(deployedPath, "utf8")) : {};

  const bridgeSenderAddr = deployed?.hederaMessageSender ?? "";
  const receiverAddr = deployed?.sepoliaMessageReceiver ?? "";

  if (!bridgeSenderAddr)
    throw new Error("hederaMessageSender not found — run hedera-orchestrator/scripts/deploy.ts first.");
  if (!receiverAddr)
    throw new Error("sepoliaMessageReceiver not found — run sepolia-executor/scripts/deploy.ts first.");

  const GAS = { gasLimit: 500_000n, gasPrice: 1_200_000_000_000n } as const;

  console.log("=== Wiring AxelarMessageSender destination ===");
  console.log("  AxelarMessageSender: ", bridgeSenderAddr);
  console.log("  AxelarMessageReceiver:", receiverAddr, "(Sepolia)");

  const bridgeSender = await ethers.getContractAt("AxelarMessageSender", bridgeSenderAddr);

  const current = await bridgeSender.destinationAddress();
  if (current.toLowerCase() === receiverAddr.toLowerCase()) {
    console.log("\nDestination already set — nothing to do. ✓");
    return;
  }

  const tx = await bridgeSender.setDestinationAddress(receiverAddr.toLowerCase(), GAS);
  await tx.wait();
  console.log("\nsetDestinationAddress tx:", tx.hash);
  console.log("destinationAddress updated to AxelarMessageReceiver ✓");
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
