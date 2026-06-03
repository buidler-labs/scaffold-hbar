import { ethers } from "ethers";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const USDC_ADDRESS = process.env.USDC_ADDRESS ?? "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
const WETH_ADDRESS = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";

const ERC20_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
];

async function main() {
  const deployedPath = path.resolve(__dirname, "../../config/deployed-addresses.json");
  if (!fs.existsSync(deployedPath))
    throw new Error("config/deployed-addresses.json not found — run deploy.ts first");

  const deployed = JSON.parse(fs.readFileSync(deployedPath, "utf8"));
  const executorAddr = deployed.sepoliaExecutor;
  if (!executorAddr) throw new Error("sepoliaExecutor not found in deployed-addresses.json");

  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  if (!rpcUrl) throw new Error("SEPOLIA_RPC_URL not set in .env");

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
  const weth = new ethers.Contract(WETH_ADDRESS, ERC20_ABI, provider);

  const [ethBalance, usdcBalance, wethBalance] = await Promise.all([
    provider.getBalance(executorAddr),
    usdc.balanceOf(executorAddr),
    weth.balanceOf(executorAddr),
  ]);

  console.log("=== DcaExecutor Balances ===");
  console.log("  Address: ", executorAddr);
  console.log();
  console.log("  ETH:  ", ethers.formatEther(ethBalance), "ETH");
  console.log("  USDC: ", ethers.formatUnits(usdcBalance, 6), "USDC");
  console.log("  WETH: ", ethers.formatEther(wethBalance), "WETH");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
