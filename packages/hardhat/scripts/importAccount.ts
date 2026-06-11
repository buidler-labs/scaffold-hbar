import { ethers } from "ethers";
import * as dotenv from "dotenv";
import * as fs from "fs";
import password from "@inquirer/password";
import select from "@inquirer/select";

const envFilePath = "./.env";

type Chain = "hedera" | "eth";

const ENV_KEY: Record<Chain, string> = {
  hedera: "HEDERA_DEPLOYER_PRIVATE_KEY_ENCRYPTED",
  eth: "ETH_DEPLOYER_PRIVATE_KEY_ENCRYPTED",
};

const CHAIN_LABEL: Record<Chain, string> = {
  hedera: "Hedera",
  eth: "ETH (Sepolia)",
};

const readEnvConfig = (): Record<string, string> => {
  if (!fs.existsSync(envFilePath)) return {};
  return dotenv.parse(fs.readFileSync(envFilePath));
};

// Writes a single key=value to .env, preserving all other lines.
// Wraps the value in single quotes so JSON content is never misread.
const writeEnvVar = (key: string, value: string) => {
  const content = fs.existsSync(envFilePath) ? fs.readFileSync(envFilePath, "utf8") : "";
  const newLine = `${key}='${value}'`;
  const lines = content.split("\n");
  const idx = lines.findIndex(l => l.startsWith(`${key}=`));
  if (idx !== -1) {
    lines[idx] = newLine;
  } else {
    lines.push(newLine);
  }
  fs.writeFileSync(envFilePath, lines.join("\n"));
};

const getValidatedPassword = async () => {
  while (true) {
    const pass = await password({ message: "Enter a password to encrypt your private key:" });
    const confirmation = await password({ message: "Confirm password:" });

    if (pass === confirmation) {
      return pass;
    }
    console.log("❌ Passwords don't match. Please try again.");
  }
};

const getWalletFromPrivateKey = async () => {
  while (true) {
    const privateKey = await password({ message: "Paste your private key:" });
    try {
      const wallet = new ethers.Wallet(privateKey);
      return wallet;
    } catch {
      console.log("❌ Invalid private key format. Please try again.");
    }
  }
};

const importForChain = async (chain: Chain) => {
  console.log(`👛 Importing Wallet for ${CHAIN_LABEL[chain]}\n`);

  const wallet = await getWalletFromPrivateKey();
  const pass = await getValidatedPassword();
  const encryptedJson = await wallet.encrypt(pass);

  writeEnvVar(ENV_KEY[chain], encryptedJson);
  console.log(`\n📄 Encrypted Private Key saved to packages/hardhat/.env file as ${ENV_KEY[chain]}`);
  console.log("🪄 Imported wallet address:", wallet.address, "\n");
  console.log("⚠️ Make sure to remember your password! You'll need it to decrypt the private key.");
};

async function main() {
  const chain = await select<Chain>({
    message: "Which chain are you importing a key for?",
    choices: [
      { name: "Hedera", value: "hedera" },
      { name: "ETH (Sepolia)", value: "eth" },
    ],
  });

  const existing = readEnvConfig();
  if (existing[ENV_KEY[chain]]) {
    console.log(`⚠️ You already have a ${CHAIN_LABEL[chain]} deployer account. Check the packages/hardhat/.env file`);
    return;
  }

  await importForChain(chain);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
