import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const deployedPath = path.resolve(__dirname, "../../config/deployed-addresses.json");

  const deployed = fs.existsSync(deployedPath) ? JSON.parse(fs.readFileSync(deployedPath, "utf8")) : {};

  const receiverAddr = deployed?.sepoliaMessageReceiver ?? "";
  const bridgeSenderAddr = deployed?.hederaMessageSender ?? "";
  const sourceChain = process.env.AXELAR_SOURCE_CHAIN_NAME ?? "hedera";

  if (!receiverAddr) throw new Error("sepoliaMessageReceiver not found — run sepolia-executor/scripts/deploy.ts first");
  if (!bridgeSenderAddr)
    throw new Error("hederaMessageSender not found — run hedera-orchestrator/scripts/deploy.ts first");

  const expectedSourceAddress = bridgeSenderAddr.toLowerCase();

  const receiver = await ethers.getContractAt("AxelarMessageReceiver", receiverAddr);

  const currentChain = await receiver.expectedSourceChain();
  const currentAddress = await receiver.expectedSourceAddress();

  console.log("=== Wiring AxelarMessageReceiver ===");
  console.log("  Receiver:       ", receiverAddr);
  console.log("  Source chain:   ", currentChain, "→", sourceChain);
  console.log("  Source address: ", currentAddress, "→", expectedSourceAddress);

  if (currentChain === sourceChain && currentAddress === expectedSourceAddress) {
    console.log("\nAlready wired — nothing to do. ✓");
    return;
  }

  if (currentChain !== sourceChain) {
    const tx = await receiver.setExpectedSourceChain(sourceChain);
    await tx.wait();
    console.log("\nsetExpectedSourceChain tx:", tx.hash, "✓");
  }

  if (currentAddress !== expectedSourceAddress) {
    const tx = await receiver.setExpectedSourceAddress(expectedSourceAddress);
    await tx.wait();
    console.log("setExpectedSourceAddress tx:", tx.hash, "✓");
  }

  console.log("\nAxelarMessageReceiver wired ✓");
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
