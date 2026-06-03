import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// Wrapped ETH on Sepolia — most liquid USDC pair on Uniswap v3 Sepolia
const SEPOLIA_WETH = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";

async function main() {
  const deployedPath = path.resolve(__dirname, "../../config/deployed-addresses.json");
  if (!fs.existsSync(deployedPath))
    throw new Error("config/deployed-addresses.json not found — run deploy.ts first");

  const deployed = JSON.parse(fs.readFileSync(deployedPath, "utf8"));
  const orchestratorAddr = deployed.hederaOrchestrator;
  if (!orchestratorAddr) throw new Error("hederaOrchestrator not found in deployed-addresses.json");

  const amountPerExecution = BigInt(process.env.AMOUNT_PER_EXECUTION ?? "1000000"); // 1 USDC (6 decimals)
  const feeForSender = ethers.parseUnits(process.env.FEE_FOR_SENDER ?? "1", 8); // 1 HBAR
  const intervalSeconds = BigInt(process.env.INTERVAL_SECONDS ?? "60");
  const targetToken = process.env.TARGET_TOKEN ?? SEPOLIA_WETH;
  const minAmountOut = BigInt(process.env.MIN_AMOUNT_OUT ?? "0");
  const maxExecutions = BigInt(process.env.MAX_EXECUTIONS ?? "3");

  const GAS = { gasLimit: 4_000_000n, gasPrice: 1_200_000_000_000n } as const;

  console.log("=== Creating DCA Plan ===");
  console.log("  Orchestrator:         ", orchestratorAddr);
  console.log("  Amount per execution: ", amountPerExecution.toString(), "source-token base units");
  console.log("  Fee for sender:       ", ethers.formatUnits(feeForSender, 8), "HBAR");
  console.log("  Interval:             ", intervalSeconds.toString(), "seconds");
  console.log("  Target token:         ", targetToken, targetToken === SEPOLIA_WETH ? "(Sepolia WETH)" : "");
  console.log("  Min amount out:       ", minAmountOut.toString(), "tokenOut base units");
  console.log("  Max executions:       ", maxExecutions === 0n ? "unlimited" : maxExecutions.toString());

  const orchestrator = await ethers.getContractAt("DcaOrchestrator", orchestratorAddr);

  const tx = await orchestrator.createPlan(
    amountPerExecution,
    feeForSender,
    intervalSeconds,
    targetToken,
    minAmountOut,
    maxExecutions,
    GAS
  );
  console.log("\nTransaction submitted:", tx.hash);
  const receipt = await tx.wait();

  const iface = orchestrator.interface;
  let planId: bigint | undefined;
  for (const log of receipt!.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed?.name === "PlanCreated") {
        planId = parsed.args.planId;
        break;
      }
    } catch { /* not our event */ }
  }

  if (planId === undefined)
    throw new Error("PlanCreated event not found in receipt — check the tx on HashScan");

  for (const log of receipt!.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed?.name === "ScheduleAttempted") {
        const ok: boolean = parsed.args.success;
        const code: bigint = parsed.args.responseCode;
        console.log(`\n  Schedule attempt — code: ${code}, success: ${ok}`);
        if (!ok)
          console.warn("  ⚠️  Scheduling failed — first execution will need to be triggered manually.");
        break;
      }
    } catch { /* not our event */ }
  }

  console.log("\n✅ Plan created successfully!");
  console.log("   Plan ID:      ", planId.toString());
  console.log("   First execution scheduled in ~", intervalSeconds.toString(), "seconds");
  console.log("\n=== Monitor progress ===");
  console.log("  Hedera:  https://hashscan.io/testnet/contract/" + orchestratorAddr);
  console.log("  Sepolia: https://sepolia.etherscan.io/address/" + deployed.sepoliaExecutor);

  deployed.testPlanId = planId.toString();
  fs.writeFileSync(deployedPath, JSON.stringify(deployed, null, 2));
  console.log("\n  Plan ID saved to config/deployed-addresses.json");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
