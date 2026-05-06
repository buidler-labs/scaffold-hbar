import * as chains from "viem/chains";

export type ScaffoldConfig = {
  targetNetworks: readonly [chains.Chain, ...chains.Chain[]];
  pollingInterval: number;
  rpcOverrides?: Record<number, string>;
  enableBurnerWallet: boolean;
  walletConnectProjectId: string;
};

const targetNetworks = [chains.hederaTestnet, chains.sepolia] as const satisfies readonly [
  chains.Chain,
  ...chains.Chain[],
];

const scaffoldConfig = {
  targetNetworks,

  pollingInterval: 10000,

  enableBurnerWallet: true,

  rpcOverrides: {
    [chains.hederaTestnet.id]: process.env.NEXT_PUBLIC_HEDERA_TESTNET_RPC_URL || "https://testnet.hashio.io/api",
    [chains.sepolia.id]: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
  },

  walletConnectProjectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "3a8170812b534d0ff9d794f19a901d64",
} as const satisfies ScaffoldConfig;

export default scaffoldConfig;
