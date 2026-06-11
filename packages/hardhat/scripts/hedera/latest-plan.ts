import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const deployedPath = path.resolve(__dirname, "../../config/deployed-addresses.json");
  if (!fs.existsSync(deployedPath)) throw new Error("config/deployed-addresses.json not found — run deploy.ts first");

  const deployed = JSON.parse(fs.readFileSync(deployedPath, "utf8"));
  const orchestratorAddr = deployed.hederaOrchestrator;
  if (!orchestratorAddr) throw new Error("hederaOrchestrator not found in deployed-addresses.json");

  const orchestrator = await ethers.getContractAt("DcaOrchestrator", orchestratorAddr);

  const nextPlanId: bigint = await orchestrator.nextPlanId();
  if (nextPlanId === 0n) {
    console.log("No plans have been created yet.");
    return;
  }

  const latestId = nextPlanId - 1n;
  const plan = await orchestrator.plans(latestId);

  console.log("=== Latest DCA Plan ===");
  console.log("  Plan ID:            ", latestId.toString());
  console.log("  Owner:              ", plan.owner);
  console.log("  Active:             ", plan.active);
  console.log("  Amount/execution:   ", plan.amountPerExecution.toString(), "source-token base units");
  console.log("  Fee for sender:     ", ethers.formatUnits(plan.feeForSender, 8), "HBAR");
  console.log("  Interval:           ", plan.intervalSeconds.toString(), "seconds");
  console.log("  Target token:       ", plan.targetToken);
  console.log("  Min amount out:     ", plan.minAmountOut.toString());
  console.log(
    "  Executions:         ",
    plan.executionCount.toString(),
    plan.maxExecutions > 0n ? `/ ${plan.maxExecutions}` : "(unlimited)",
  );
  console.log("\n  HashScan: https://hashscan.io/testnet/contract/" + orchestratorAddr);
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
