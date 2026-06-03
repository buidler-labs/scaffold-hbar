import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const deployedPath = path.resolve(__dirname, "../../config/deployed-addresses.json");
  if (!fs.existsSync(deployedPath))
    throw new Error("config/deployed-addresses.json not found — run deploy.ts first");

  const orchestratorFundAmount = process.env.ORCHESTRATOR_FUND_AMOUNT ?? "10";
  const { hederaOrchestrator: ORCHESTRATOR } = JSON.parse(fs.readFileSync(deployedPath, "utf8"));
  const [funder] = await ethers.getSigners();

  console.log("Funding amount:", orchestratorFundAmount, "HBAR");
  const balanceBefore = await ethers.provider.getBalance(ORCHESTRATOR);
  console.log("Orchestrator balance before:", ethers.formatEther(balanceBefore), "HBAR");

  const tx = await funder.sendTransaction({
    to: ORCHESTRATOR,
    value: ethers.parseEther(orchestratorFundAmount),
    gasLimit: 100_000,
    gasPrice: 1_200_000_000_000n,
  });
  console.log("Tx hash:", tx.hash);
  await tx.wait();

  const balanceAfter = await ethers.provider.getBalance(ORCHESTRATOR);
  console.log("Orchestrator balance after:", ethers.formatEther(balanceAfter), "HBAR");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
