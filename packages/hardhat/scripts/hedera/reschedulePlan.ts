import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { getHederaWallet } from "../utils/decryptKey";

async function main() {
  const deployedPath = path.resolve(__dirname, "../../config/deployed-addresses.json");
  if (!fs.existsSync(deployedPath)) throw new Error("config/deployed-addresses.json not found — run deploy.ts first");

  const planIdEnv = process.env.PLAN_ID;
  if (!planIdEnv) throw new Error("PLAN_ID env variable is required");

  const planId = BigInt(planIdEnv);

  const deployed = JSON.parse(fs.readFileSync(deployedPath, "utf8"));
  const orchestratorAddr = deployed.hederaOrchestrator;
  if (!orchestratorAddr) throw new Error("hederaOrchestrator not found in deployed-addresses.json");

  const GAS = { gasLimit: 4_000_000n, gasPrice: 1_200_000_000_000n } as const;

  console.log("=== Rescheduling DCA Plan ===");
  console.log("  Orchestrator: ", orchestratorAddr);
  console.log("  Plan ID:      ", planId.toString());

  const signer = (await getHederaWallet()).connect(ethers.provider);
  const orchestrator = await ethers.getContractAt("DcaOrchestrator", orchestratorAddr, signer);

  const needsReschedule = await orchestrator.needsReschedule(planId);
  if (!needsReschedule) {
    console.log("\n⚠️  Plan does not have needsReschedule set — nothing to do.");
    console.log("   Check that the plan ID is correct and that a prior scheduling failure occurred.");
    process.exit(0);
  }

  const tx = await orchestrator.reschedule(planId, GAS);
  console.log("\nTransaction submitted:", tx.hash);
  await tx.wait();

  console.log("\n✅ Plan rescheduled successfully!");
  console.log("   Plan ID: ", planId.toString());
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
