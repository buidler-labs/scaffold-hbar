import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const configDir = path.resolve(__dirname, "../../config");
  const deployedPath = path.join(configDir, "deployed-addresses.json");

  const deployed = fs.existsSync(deployedPath)
    ? JSON.parse(fs.readFileSync(deployedPath, "utf8"))
    : {};

  const gateway = process.env.AXELAR_GATEWAY_HEDERA ?? "0xe432150cce91c13a887f7D836923d5597adD8E31";
  const gasService = process.env.AXELAR_GAS_SERVICE_HEDERA ?? "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6";
  const destinationChain = process.env.AXELAR_DESTINATION_CHAIN_NAME ?? "ethereum-sepolia";
  const destinationAddress = deployed?.sepoliaMessageReceiver ?? "";

  // Hedera's JSON-RPC relay rejects eth_estimateGas without an explicit gasPrice.
  const GAS = { gasLimit: 4_000_000n, gasPrice: 1_200_000_000_000n } as const;

  if (!destinationAddress) {
    console.warn(
      "⚠️  sepoliaMessageReceiver not found in deployed-addresses.json — AxelarMessageSender will be deployed with an empty destination. Run scripts/wire.ts after deploying sepolia-executor to complete wiring."
    );
  }

  console.log("=== Deploying AxelarMessageSender ===");
  console.log("  Gateway:             ", gateway);
  console.log("  Gas service:         ", gasService);
  console.log("  Destination chain:   ", destinationChain);
  console.log("  Destination address: ", destinationAddress);

  const senderFactory = await ethers.getContractFactory("AxelarMessageSender");
  const bridgeSender = await senderFactory.deploy(gateway, gasService, destinationChain, destinationAddress, GAS);
  await bridgeSender.waitForDeployment();
  const senderAddress = await bridgeSender.getAddress();
  console.log("\nAxelarMessageSender deployed to:", senderAddress);

  console.log("\n=== Deploying DcaOrchestrator ===");
  const orchestratorFactory = await ethers.getContractFactory("DcaOrchestrator");
  const orchestrator = await orchestratorFactory.deploy(senderAddress, GAS);
  await orchestrator.waitForDeployment();
  const orchestratorAddress = await orchestrator.getAddress();
  console.log("DcaOrchestrator deployed to:", orchestratorAddress);

  console.log("\n=== Wiring AxelarMessageSender → DcaOrchestrator ===");
  const tx = await bridgeSender.setAuthorizedCaller(orchestratorAddress, GAS);
  await tx.wait();
  console.log("authorizedCaller set to DcaOrchestrator ✓");

  fs.mkdirSync(configDir, { recursive: true });
  deployed.hederaMessageSender = senderAddress;
  deployed.hederaOrchestrator = orchestratorAddress;
  fs.writeFileSync(deployedPath, JSON.stringify(deployed, null, 2));
  console.log("\nAddresses saved to config/deployed-addresses.json");

  // Generate deployedContracts.ts for the nextjs frontend
  await generateDeployedContracts(configDir);

  if (!destinationAddress) {
    console.log("\n=== Next steps ===");
    console.log("  1. Deploy sepolia-executor:  yarn dca:sepolia:deploy");
    console.log("  2. Wire destination address: yarn dca:hedera:wire");
  }
}

async function generateDeployedContracts(configDir: string) {
  const scriptPath = path.resolve(__dirname, "../../scripts/generate-deployed-contracts.ts");
  if (fs.existsSync(scriptPath)) {
    const { generateDeployedContracts } = await import("../../scripts/generate-deployed-contracts");
    await generateDeployedContracts(configDir);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
