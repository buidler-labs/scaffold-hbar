import hre from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function verifyEtherscan(name: string, address: string, constructorArguments: unknown[]): Promise<void> {
  console.log(`\n=== Verifying ${name} on Etherscan ===`);
  console.log("  Address:", address);
  try {
    await hre.run("verify:verify", { address, constructorArguments });
    console.log(`  ${name} verified ✓`);
    console.log(`  Etherscan: https://sepolia.etherscan.io/address/${address}`);
  } catch (err: any) {
    if (err.message?.toLowerCase().includes("already verified")) {
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

  const executorAddr = deployed.sepoliaExecutor;
  const receiverAddr = deployed.sepoliaMessageReceiver;
  const executorArgs: unknown[] = deployed.sepoliaExecutorArgs;
  const receiverArgs: unknown[] = deployed.sepoliaMessageReceiverArgs;

  if (!executorAddr) throw new Error("sepoliaExecutor not found in deployed-addresses.json");
  if (!receiverAddr) throw new Error("sepoliaMessageReceiver not found in deployed-addresses.json");
  if (!executorArgs) throw new Error("sepoliaExecutorArgs not found — redeploy to save constructor args");
  if (!receiverArgs) throw new Error("sepoliaMessageReceiverArgs not found — redeploy to save constructor args");

  await verifyEtherscan("DcaExecutor", executorAddr, executorArgs);
  await verifyEtherscan("AxelarMessageReceiver", receiverAddr, receiverArgs);

  console.log("\n✅ Sepolia verification complete.");
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
