import { ethers } from "ethers";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { getTokensWithBalance } from "./lib/token-scanner";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const EXECUTOR_ABI = [
  "function withdrawETH() external",
  "function withdrawToken(address token) external",
];

async function main() {
  const deployedPath = path.resolve(__dirname, "../../config/deployed-addresses.json");
  if (!fs.existsSync(deployedPath))
    throw new Error("config/deployed-addresses.json not found — run deploy.ts first");

  const deployed = JSON.parse(fs.readFileSync(deployedPath, "utf8"));
  const executorAddr = deployed.sepoliaExecutor;
  if (!executorAddr) throw new Error("sepoliaExecutor not found in deployed-addresses.json");

  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const privateKey = process.env.SEPOLIA_PRIVATE_KEY;
  if (!rpcUrl) throw new Error("SEPOLIA_RPC_URL not set in .env");
  if (!privateKey) throw new Error("SEPOLIA_PRIVATE_KEY not set in .env");

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const owner = new ethers.Wallet(privateKey, provider);
  const executor = new ethers.Contract(executorAddr, EXECUTOR_ABI, owner);

  console.log("=== Withdrawing from DcaExecutor ===");
  console.log("  Executor: ", executorAddr);
  console.log("  Owner:    ", owner.address);

  const ethBalance = await provider.getBalance(executorAddr);
  console.log("\n  ETH balance: ", ethers.formatEther(ethBalance), "ETH");
  if (ethBalance > 0n) {
    const tx = await executor.withdrawETH();
    await tx.wait();
    console.log("  Withdrawn. Tx:", tx.hash);
  } else {
    console.log("  Skipping — zero balance.");
  }

  console.log("\n  Scanning for ERC-20 tokens...");
  const tokens = await getTokensWithBalance(executorAddr, provider);

  if (tokens.length === 0) {
    console.log("  No ERC-20 tokens with non-zero balance found.");
  } else {
    for (const token of tokens) {
      console.log(
        `\n  ${token.symbol} (${token.address}): ${ethers.formatUnits(token.balance, token.decimals)}`
      );
      const tx = await executor.withdrawToken(token.address);
      await tx.wait();
      console.log("  Withdrawn. Tx:", tx.hash);
    }
  }

  console.log("\n✅ Done.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
