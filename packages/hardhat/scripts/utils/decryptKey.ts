import { Wallet } from "ethers";
import password from "@inquirer/password";

export const decryptKey = async (encryptedJson: string, chain: "Hedera" | "ETH"): Promise<Wallet> => {
  const pass = await password({ message: `Enter password to decrypt your ${chain} private key:` });
  try {
    return (await Wallet.fromEncryptedJson(encryptedJson, pass)) as Wallet;
  } catch {
    console.log(`❌ Failed to decrypt ${chain} private key. Wrong password?`);
    process.exit(1);
  }
};

// Returns the ETH (Sepolia) deployer wallet.
// When __RUNTIME_ETH_PRIVATE_KEY is set (injected by deploy-all.ts), uses it directly
// so the user is not prompted for a password a second time.
export const getEthWallet = async (): Promise<Wallet> => {
  if (process.env.__RUNTIME_ETH_PRIVATE_KEY) {
    return new Wallet(process.env.__RUNTIME_ETH_PRIVATE_KEY);
  }
  const encryptedKey = process.env.ETH_DEPLOYER_PRIVATE_KEY_ENCRYPTED;
  if (!encryptedKey) {
    console.error("ETH_DEPLOYER_PRIVATE_KEY_ENCRYPTED not set — run `yarn account:generate` first");
    process.exit(1);
  }
  return decryptKey(encryptedKey, "ETH");
};
