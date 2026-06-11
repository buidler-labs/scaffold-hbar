import { ethers } from "ethers";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { getEthWallet } from "../utils/decryptKey";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const USDC_ADDRESS = process.env.USDC_ADDRESS ?? "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
const USDC_DECIMALS = 6;

const USDC_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
];

async function main() {
  const deployedPath = path.resolve(__dirname, "../../config/deployed-addresses.json");
  if (!fs.existsSync(deployedPath)) throw new Error("config/deployed-addresses.json not found — run deploy.ts first");

  const deployed = JSON.parse(fs.readFileSync(deployedPath, "utf8"));
  const executorAddr = deployed.sepoliaExecutor;
  if (!executorAddr) throw new Error("sepoliaExecutor not found in deployed-addresses.json");

  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  if (!rpcUrl) throw new Error("SEPOLIA_RPC_URL not set in .env");

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const deployer = (await getEthWallet()).connect(provider);
  const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, deployer);

  const amount = process.env.FUND_USDC_AMOUNT ?? "5";
  const amountWei = ethers.parseUnits(amount, USDC_DECIMALS);

  console.log("Deployer address:", deployer.address);
  console.log("Executor address:", executorAddr);
  console.log("Deployer USDC balance:", ethers.formatUnits(await usdc.balanceOf(deployer.address), USDC_DECIMALS));
  console.log(`Transferring ${amount} USDC to executor...`);

  const tx = await usdc.transfer(executorAddr, amountWei);
  await tx.wait();

  console.log("Executor USDC balance:", ethers.formatUnits(await usdc.balanceOf(executorAddr), USDC_DECIMALS));
  console.log("Done.");
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
