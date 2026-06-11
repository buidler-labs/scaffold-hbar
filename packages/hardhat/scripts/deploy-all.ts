import * as dotenv from "dotenv";
dotenv.config();
import { Wallet } from "ethers";
import { spawn } from "child_process";
import * as readline from "readline";
import password from "@inquirer/password";

// ── config (defaults overridden by .env) ──────────────────────────────────────
const cfg = {
  axelarGatewayHedera: process.env.AXELAR_GATEWAY_HEDERA ?? "0xe432150cce91c13a887f7D836923d5597adD8E31",
  axelarGasServiceHedera: process.env.AXELAR_GAS_SERVICE_HEDERA ?? "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6",
  axelarDestinationChainName: process.env.AXELAR_DESTINATION_CHAIN_NAME ?? "ethereum-sepolia",
  axelarSourceChainName: process.env.AXELAR_SOURCE_CHAIN_NAME ?? "hedera",
  axelarGatewaySepolia: process.env.AXELAR_GATEWAY_SEPOLIA ?? "",
  uniswapRouter: process.env.UNISWAP_ROUTER ?? "0x65669fE35312947050C450Bd5d36e6361F85eC12",
  usdcAddress: process.env.USDC_ADDRESS ?? "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  orchestratorFundAmount: process.env.ORCHESTRATOR_FUND_AMOUNT ?? "10",
  fundUsdcAmount: process.env.FUND_USDC_AMOUNT ?? "5",
  amountPerExecution: process.env.AMOUNT_PER_EXECUTION ?? "1000000",
  feeForSender: process.env.FEE_FOR_SENDER ?? "5",
  intervalSeconds: process.env.INTERVAL_SECONDS ?? "60",
  targetToken: process.env.TARGET_TOKEN ?? "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
  minAmountOut: process.env.MIN_AMOUNT_OUT ?? "0",
  maxExecutions: process.env.MAX_EXECUTIONS ?? "3",
};

// ── helpers ───────────────────────────────────────────────────────────────────
const decryptPrivateKey = async (encryptedJson: string, chain: string): Promise<string> => {
  const pass = await password({ message: `Enter password to decrypt ${chain} private key:` });
  try {
    const wallet = await Wallet.fromEncryptedJson(encryptedJson, pass);
    return wallet.privateKey;
  } catch {
    console.error(`❌ Failed to decrypt ${chain} private key. Wrong password?`);
    process.exit(1);
  }
};

const confirm = (prompt: string): Promise<boolean> =>
  new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(prompt, answer => {
      rl.close();
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });

const runStep = (label: string, args: string[], env: NodeJS.ProcessEnv): Promise<void> =>
  new Promise((resolve, reject) => {
    console.log(`\n── ${label} ${"─".repeat(Math.max(0, 52 - label.length))}`);
    const child = spawn("hardhat", args, {
      stdio: "inherit",
      env,
      shell: process.platform === "win32",
    });
    child.on("exit", code => {
      if (code === 0) resolve();
      else reject(new Error(`Step "${label}" failed with exit code ${code}`));
    });
  });

// ── main ──────────────────────────────────────────────────────────────────────
async function main() {
  // Required variable check
  const missing: string[] = [];
  if (!process.env.HEDERA_DEPLOYER_PRIVATE_KEY_ENCRYPTED) missing.push("HEDERA_DEPLOYER_PRIVATE_KEY_ENCRYPTED");
  if (!process.env.ETH_DEPLOYER_PRIVATE_KEY_ENCRYPTED) missing.push("ETH_DEPLOYER_PRIVATE_KEY_ENCRYPTED");
  if (!process.env.SEPOLIA_RPC_URL) missing.push("SEPOLIA_RPC_URL");
  if (!cfg.axelarGatewaySepolia) missing.push("AXELAR_GATEWAY_SEPOLIA");

  if (missing.length > 0) {
    console.error("\n  ERROR: Missing required environment variables:");
    for (const v of missing) console.error(`    ${v}`);
    console.error("\n  Set them in packages/hardhat/.env or export them before running.");
    process.exit(1);
  }

  // Decrypt both keys upfront — one password ceremony before any network calls
  const hederaKey = await decryptPrivateKey(process.env.HEDERA_DEPLOYER_PRIVATE_KEY_ENCRYPTED!, "Hedera");
  const ethKey = await decryptPrivateKey(process.env.ETH_DEPLOYER_PRIVATE_KEY_ENCRYPTED!, "ETH (Sepolia)");

  // Config summary + confirmation
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║         Cross-chain DCA — Full Deployment (8 steps)          ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log("\n  Steps:");
  console.log("    1. Compile all contracts");
  console.log("    2. Deploy Hedera contracts  (AxelarMessageSender + DcaOrchestrator)");
  console.log("    3. Deploy Sepolia contracts (DcaExecutor + AxelarMessageReceiver)");
  console.log("    4. Wire Hedera contracts    (set Sepolia receiver as destination)");
  console.log("    5. Wire Sepolia contracts   (set Hedera sender as expected source)");
  console.log("    6. Fund DcaOrchestrator with HBAR");
  console.log("    7. Fund DcaExecutor with USDC");
  console.log("    8. Create DCA plan");
  console.log("\n  Configuration:");
  console.log(`    AXELAR_GATEWAY_HEDERA         = ${cfg.axelarGatewayHedera}`);
  console.log(`    AXELAR_GAS_SERVICE_HEDERA     = ${cfg.axelarGasServiceHedera}`);
  console.log(`    AXELAR_DESTINATION_CHAIN_NAME = ${cfg.axelarDestinationChainName}`);
  console.log(`    AXELAR_SOURCE_CHAIN_NAME      = ${cfg.axelarSourceChainName}`);
  console.log(`    AXELAR_GATEWAY_SEPOLIA        = ${cfg.axelarGatewaySepolia}`);
  console.log(`    UNISWAP_ROUTER                = ${cfg.uniswapRouter}`);
  console.log(`    USDC_ADDRESS                  = ${cfg.usdcAddress}`);
  console.log(`    ORCHESTRATOR_FUND_AMOUNT      = ${cfg.orchestratorFundAmount} HBAR`);
  console.log(`    FUND_USDC_AMOUNT              = ${cfg.fundUsdcAmount} USDC`);
  console.log(`    AMOUNT_PER_EXECUTION          = ${cfg.amountPerExecution} (base units)`);
  console.log(`    FEE_FOR_SENDER                = ${cfg.feeForSender} HBAR`);
  console.log(`    INTERVAL_SECONDS              = ${cfg.intervalSeconds}s`);
  console.log(`    TARGET_TOKEN                  = ${cfg.targetToken}`);
  console.log(`    MIN_AMOUNT_OUT                = ${cfg.minAmountOut}`);
  console.log(`    MAX_EXECUTIONS                = ${cfg.maxExecutions}`);
  console.log("");

  const proceed = await confirm("Proceed with deployment to live testnets? [y/N] ");
  if (!proceed) {
    console.log("Aborted.");
    process.exit(0);
  }

  // Build per-chain envs with decrypted runtime keys
  const hederaEnv: NodeJS.ProcessEnv = { ...process.env, __RUNTIME_HEDERA_PRIVATE_KEY: hederaKey };
  const ethEnv: NodeJS.ProcessEnv = { ...process.env, __RUNTIME_ETH_PRIVATE_KEY: ethKey };

  // Execute all 8 steps — stop immediately on any failure
  await runStep("1/8  Compile contracts", ["compile"], process.env);
  await runStep(
    "2/8  Deploy Hedera contracts",
    ["run", "scripts/hedera/deploy.ts", "--network", "hederaTestnet"],
    hederaEnv,
  );
  await runStep(
    "3/8  Deploy Sepolia contracts",
    ["run", "scripts/sepolia/deploy.ts", "--network", "ethereumSepolia"],
    ethEnv,
  );
  await runStep(
    "4/8  Wire Hedera contracts",
    ["run", "scripts/hedera/wire.ts", "--network", "hederaTestnet"],
    hederaEnv,
  );
  await runStep(
    "5/8  Wire Sepolia contracts",
    ["run", "scripts/sepolia/wire.ts", "--network", "ethereumSepolia"],
    ethEnv,
  );
  await runStep(
    "6/8  Fund DcaOrchestrator with HBAR",
    ["run", "scripts/hedera/fund-orchestrator.ts", "--network", "hederaTestnet"],
    hederaEnv,
  );
  await runStep(
    "7/8  Fund DcaExecutor with USDC",
    ["run", "scripts/sepolia/fund-usdc.ts", "--network", "ethereumSepolia"],
    ethEnv,
  );
  await runStep(
    "8/8  Create DCA plan",
    ["run", "scripts/hedera/create-plan.ts", "--network", "hederaTestnet"],
    hederaEnv,
  );

  console.log("\n✔  Deployment complete.");
  console.log("\n  Next steps:");
  console.log("    Inspect plan:    yarn hardhat:hedera:plan:latest");
  console.log("    Check balances:  yarn hardhat:sepolia:balance:check");
  console.log("    Frontend:        yarn next:start  →  http://localhost:3000/dca");
}

main().catch(err => {
  console.error("\n❌", err.message);
  process.exit(1);
});
