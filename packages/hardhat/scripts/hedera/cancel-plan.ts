import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const deployedPath = path.resolve(__dirname, "../../config/deployed-addresses.json");
  if (!fs.existsSync(deployedPath)) throw new Error("config/deployed-addresses.json not found — run deploy.ts first");

  const cancelPlanId = process.env.CANCEL_PLAN_ID;
  if (!cancelPlanId) throw new Error("CANCEL_PLAN_ID env variable is required");

  const planId = BigInt(cancelPlanId);

  const deployed = JSON.parse(fs.readFileSync(deployedPath, "utf8"));
  const orchestratorAddr = deployed.hederaOrchestrator;
  if (!orchestratorAddr) throw new Error("hederaOrchestrator not found in deployed-addresses.json");

  const GAS = { gasLimit: 4_000_000n, gasPrice: 1_200_000_000_000n } as const;

  console.log("=== Cancelling DCA Plan ===");
  console.log("  Orchestrator: ", orchestratorAddr);
  console.log("  Plan ID:      ", planId.toString());

  const orchestrator = await ethers.getContractAt("DcaOrchestrator", orchestratorAddr);

  const tx = await orchestrator.cancelPlan(planId, GAS);
  console.log("\nTransaction submitted:", tx.hash);
  await tx.wait();

  console.log("\n✅ Plan cancelled successfully!");
  console.log("   Plan ID: ", planId.toString());
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
