import hre from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function verifySourcify(name: string, address: string): Promise<void> {
  console.log(`\n=== Verifying ${name} on Sourcify ===`);
  console.log("  Address:", address);
  try {
    await hre.run("verify:sourcify", { address });
    console.log(`  ${name} verified ✓`);
    const chainId = hre.network.config.chainId;
    if (chainId === 295 || chainId === 296) {
      const network = chainId === 295 ? "mainnet" : "testnet";
      console.log(`  HashScan: https://hashscan.io/${network}/contract/${address}`);
    }
  } catch (err) {
    if (err instanceof Error && err.message.toLowerCase().includes("already verified")) {
      console.log(`  ${name} already verified ✓`);
    } else {
      throw err;
    }
  }
}

async function main() {
  const deployedPath = path.resolve(__dirname, "../../config/deployed-addresses.json");
  if (!fs.existsSync(deployedPath)) throw new Error("config/deployed-addresses.json not found — run deploy.ts first");

  const deployed = JSON.parse(fs.readFileSync(deployedPath, "utf8"));

  const senderAddr = deployed.hederaMessageSender;
  const orchestratorAddr = deployed.hederaOrchestrator;

  if (!senderAddr) throw new Error("hederaMessageSender not found in deployed-addresses.json");
  if (!orchestratorAddr) throw new Error("hederaOrchestrator not found in deployed-addresses.json");

  await verifySourcify("AxelarMessageSender", senderAddr);
  await verifySourcify("DcaOrchestrator", orchestratorAddr);

  console.log("\n✅ Hedera verification complete.");
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
