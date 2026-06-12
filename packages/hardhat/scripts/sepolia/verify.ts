import hre from "hardhat";
import * as fs from "fs";
import * as path from "path";
import password from "@inquirer/password";

const envFilePath = "./.env";

const writeEnvVar = (key: string, value: string) => {
  const content = fs.existsSync(envFilePath) ? fs.readFileSync(envFilePath, "utf8") : "";
  const newLine = `${key}='${value}'`;
  const lines = content.split("\n");
  const idx = lines.findIndex(l => l.startsWith(`${key}=`));
  if (idx !== -1) {
    lines[idx] = newLine;
  } else {
    lines.push(newLine);
  }
  fs.writeFileSync(envFilePath, lines.join("\n"));
};

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
  if (!process.env.ETHERSCAN_API_KEY) {
    const apiKey = await password({ message: "Enter Etherscan API key (required for Sepolia verification):" });
    writeEnvVar("ETHERSCAN_API_KEY", apiKey);
    process.env.ETHERSCAN_API_KEY = apiKey;
    hre.config.etherscan.apiKey = apiKey;
  }

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
