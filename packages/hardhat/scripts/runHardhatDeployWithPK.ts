import * as dotenv from "dotenv";
dotenv.config();
import { Wallet } from "ethers";
import password from "@inquirer/password";
import { spawn } from "child_process";
import { config } from "hardhat";

const HEDERA_NETWORKS = new Set(["hederaTestnet", "hederaMainnet"]);
const ETH_NETWORKS = new Set(["ethereumSepolia"]);

/**
 * Unencrypts the private key for the target chain and runs the hardhat deploy command.
 * Chain is auto-detected from --network flag; for localhost/hardhat no decryption is needed.
 */
async function main() {
  const networkIndex = process.argv.indexOf("--network");
  const networkName = networkIndex !== -1 ? process.argv[networkIndex + 1] : config.defaultNetwork;

  if (networkName === "localhost" || networkName === "hardhat") {
    const hardhat = spawn("hardhat", ["deploy", ...process.argv.slice(2)], {
      stdio: "inherit",
      env: process.env,
      shell: process.platform === "win32",
    });
    hardhat.on("exit", code => process.exit(code || 0));
    return;
  }

  let encryptedKey: string | undefined;
  let runtimeEnvKey: string;
  let chainLabel: string;

  if (HEDERA_NETWORKS.has(networkName)) {
    encryptedKey = process.env.HEDERA_DEPLOYER_PRIVATE_KEY_ENCRYPTED;
    runtimeEnvKey = "__RUNTIME_HEDERA_PRIVATE_KEY";
    chainLabel = "Hedera";
  } else if (ETH_NETWORKS.has(networkName)) {
    encryptedKey = process.env.ETH_DEPLOYER_PRIVATE_KEY_ENCRYPTED;
    runtimeEnvKey = "__RUNTIME_ETH_PRIVATE_KEY";
    chainLabel = "ETH (Sepolia)";
  } else {
    console.error(
      `❌ Unknown network "${networkName}". Add it to HEDERA_NETWORKS or ETH_NETWORKS in runHardhatDeployWithPK.ts`,
    );
    process.exit(1);
  }

  if (!encryptedKey) {
    console.log(
      `🚫️ You don't have a ${chainLabel} deployer account. Run \`yarn account:generate\` or \`yarn account:import\` first`,
    );
    return;
  }

  const pass = await password({ message: `Enter password to decrypt ${chainLabel} private key:` });

  try {
    const wallet = await Wallet.fromEncryptedJson(encryptedKey, pass);
    process.env[runtimeEnvKey] = wallet.privateKey;

    const hardhat = spawn("hardhat", ["deploy", ...process.argv.slice(2)], {
      stdio: "inherit",
      env: process.env,
      shell: process.platform === "win32",
    });
    hardhat.on("exit", code => process.exit(code || 0));
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    console.error(`❌ Failed to decrypt ${chainLabel} private key. Wrong password?`);
    process.exit(1);
  }
}

main().catch(console.error);
