import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const HEDERA_RPC_URL = process.env.HEDERA_RPC_URL ?? "https://testnet.hashio.io/api";
const HEDERA_PRIVATE_KEY = process.env.HEDERA_PRIVATE_KEY ?? "";
const HEDERA_CHAIN_ID = process.env.HEDERA_CHAIN_ID ? Number(process.env.HEDERA_CHAIN_ID) : 296;

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    "hedera-testnet": {
      url: HEDERA_RPC_URL,
      chainId: HEDERA_CHAIN_ID,
      accounts: HEDERA_PRIVATE_KEY ? [HEDERA_PRIVATE_KEY] : [],
      gas: 4_000_000,
      gasPrice: 1_200_000_000_000,
    },
  },
};

export default config;
