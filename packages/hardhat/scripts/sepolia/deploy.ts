import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const configDir = path.resolve(__dirname, "../../config");
  const deployedPath = path.join(configDir, "deployed-addresses.json");

  const deployed = fs.existsSync(deployedPath) ? JSON.parse(fs.readFileSync(deployedPath, "utf8")) : {};

  const gateway = process.env.AXELAR_GATEWAY_SEPOLIA ?? "";
  const sourceChain = process.env.AXELAR_SOURCE_CHAIN_NAME ?? "hedera";
  const bridgeSenderAddr = deployed?.hederaMessageSender ?? "";
  const swapRouter = process.env.UNISWAP_ROUTER ?? "0x65669fE35312947050C450Bd5d36e6361F85eC12";
  const sourceToken = process.env.USDC_ADDRESS ?? "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

  if (!gateway) throw new Error("AXELAR_GATEWAY_SEPOLIA is required");
  if (!bridgeSenderAddr)
    throw new Error(
      "hederaMessageSender not found in config/deployed-addresses.json — deploy hedera-orchestrator first.",
    );

  const expectedSourceAddress = bridgeSenderAddr.toLowerCase();

  console.log("=== Deploying DcaExecutor ===");
  console.log("  SwapRouter:  ", swapRouter);
  console.log("  SourceToken: ", sourceToken);

  const executorFactory = await ethers.getContractFactory("DcaExecutor");
  const executor = await executorFactory.deploy(swapRouter, sourceToken);
  await executor.waitForDeployment();
  const executorAddress = await executor.getAddress();
  console.log("DcaExecutor deployed to:", executorAddress);

  console.log("\n=== Deploying AxelarMessageReceiver ===");
  console.log("  Gateway:                ", gateway);
  console.log("  Expected source chain:  ", sourceChain);
  console.log("  Expected source address:", expectedSourceAddress);
  console.log("  Handler (DcaExecutor):  ", executorAddress);

  const receiverFactory = await ethers.getContractFactory("AxelarMessageReceiver");
  const receiver = await receiverFactory.deploy(gateway, sourceChain, expectedSourceAddress, executorAddress);
  await receiver.waitForDeployment();
  const receiverAddress = await receiver.getAddress();
  console.log("AxelarMessageReceiver deployed to:", receiverAddress);

  console.log("\n=== Wiring AxelarMessageReceiver → DcaExecutor ===");
  const tx = await executor.setAuthorizedCaller(receiverAddress);
  await tx.wait();
  console.log("authorizedCaller set to AxelarMessageReceiver ✓");

  fs.mkdirSync(configDir, { recursive: true });
  deployed.sepoliaExecutor = executorAddress;
  deployed.sepoliaExecutorArgs = [swapRouter, sourceToken];
  deployed.sepoliaMessageReceiver = receiverAddress;
  deployed.sepoliaMessageReceiverArgs = [gateway, sourceChain, expectedSourceAddress, executorAddress];
  fs.writeFileSync(deployedPath, JSON.stringify(deployed, null, 2));
  console.log("\nAddresses saved to config/deployed-addresses.json");

  // Generate deployedContracts.ts for the nextjs frontend
  await generateDeployedContracts(configDir);
}

async function generateDeployedContracts(configDir: string) {
  const scriptPath = path.resolve(__dirname, "../../scripts/generate-deployed-contracts.ts");
  if (fs.existsSync(scriptPath)) {
    const { generateDeployedContracts } = await import("../generate-deployed-contracts");
    await generateDeployedContracts(configDir);
  }
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
