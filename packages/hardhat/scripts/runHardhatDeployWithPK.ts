import * as dotenv from "dotenv";
dotenv.config();
import { Wallet } from "ethers";
import password from "@inquirer/password";
import { spawn } from "child_process";
import { config } from "hardhat";

/**
 * Unencrypts the private key and runs the hardhat deploy command.
 * Accepts network as either:
 *   - Positional argument: ts-node runHardhatDeployWithPK.ts hederaTestnet
 *   - Flag argument: ts-node runHardhatDeployWithPK.ts --network hederaTestnet
 */
async function main() {
  const networkIndex = process.argv.indexOf("--network");
  let networkName: string;
  let extraArgs: string[];

  if (networkIndex !== -1) {
    networkName = process.argv[networkIndex + 1];
    extraArgs = process.argv.slice(2).filter((_, i) => i !== networkIndex - 2 && i !== networkIndex - 1);
  } else if (process.argv[2] && !process.argv[2].startsWith("-")) {
    networkName = process.argv[2];
    extraArgs = process.argv.slice(3);
  } else {
    networkName = config.defaultNetwork;
    extraArgs = process.argv.slice(2);
  }

  const hardhatArgs = ["deploy", "--network", networkName, ...extraArgs];

  if (networkName === "localhost" || networkName === "hardhat") {
    const hardhat = spawn("hardhat", hardhatArgs, {
      stdio: "inherit",
      env: process.env,
      shell: process.platform === "win32",
    });

    hardhat.on("exit", code => {
      process.exit(code || 0);
    });
    return;
  }

  const encryptedKey = process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED;

  if (!encryptedKey) {
    console.log("🚫️ You don't have a deployer account. Run `yarn account:generate` or `yarn account:import` first");
    return;
  }

  const pass = await password({ message: "Enter password to decrypt private key:" });

  try {
    const wallet = await Wallet.fromEncryptedJson(encryptedKey, pass);
    process.env.__RUNTIME_DEPLOYER_PRIVATE_KEY = wallet.privateKey;

    const hardhat = spawn("hardhat", hardhatArgs, {
      stdio: "inherit",
      env: process.env,
      shell: process.platform === "win32",
    });

    hardhat.on("exit", code => {
      process.exit(code || 0);
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    console.error("Failed to decrypt private key. Wrong password?");
    process.exit(1);
  }
}

main().catch(console.error);
