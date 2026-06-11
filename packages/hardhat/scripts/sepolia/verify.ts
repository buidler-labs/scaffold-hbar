import hre from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const deployedPath = path.resolve(__dirname, "../../config/deployed-addresses.json");

  if (!fs.existsSync(deployedPath)) throw new Error("config/deployed-addresses.json not found — run deploy.ts first");

  const deployed = JSON.parse(fs.readFileSync(deployedPath, "utf8"));

  const executorAddr = deployed.sepoliaExecutor;
  const receiverAddr = deployed.sepoliaMessageReceiver;
  const bridgeSenderAddr = deployed.hederaMessageSender;

  if (!executorAddr) throw new Error("sepoliaExecutor not found in deployed-addresses.json");
  if (!receiverAddr) throw new Error("sepoliaMessageReceiver not found in deployed-addresses.json");

  const swapRouter = process.env.UNISWAP_ROUTER ?? "0x65669fE35312947050C450Bd5d36e6361F85eC12";
  const sourceToken = process.env.USDC_ADDRESS ?? "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
  const gateway = process.env.AXELAR_GATEWAY_SEPOLIA ?? "";
  const sourceChain = process.env.AXELAR_SOURCE_CHAIN_NAME ?? "hedera";
  const expectedSourceAddress = bridgeSenderAddr ? bridgeSenderAddr.toLowerCase() : "";

  if (!gateway) throw new Error("AXELAR_GATEWAY_SEPOLIA not set");
  if (!expectedSourceAddress)
    throw new Error("hederaMessageSender not found — run hedera-orchestrator/scripts/deploy.ts first");

  console.log("=== Verifying DcaExecutor ===");
  try {
    await hre.run("verify:verify", {
      address: executorAddr,
      constructorArguments: [swapRouter, sourceToken],
    });
    console.log("  DcaExecutor verified ✓\n");
  } catch (err: any) {
    if (err.message?.includes("Already Verified")) {
      console.log("  DcaExecutor already verified ✓\n");
    } else {
      throw err;
    }
  }

  console.log("=== Verifying AxelarMessageReceiver ===");
  try {
    await hre.run("verify:verify", {
      address: receiverAddr,
      constructorArguments: [gateway, sourceChain, expectedSourceAddress, executorAddr],
    });
    console.log("  AxelarMessageReceiver verified ✓");
  } catch (err: any) {
    if (err.message?.includes("Already Verified")) {
      console.log("  AxelarMessageReceiver already verified ✓");
    } else {
      throw err;
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
