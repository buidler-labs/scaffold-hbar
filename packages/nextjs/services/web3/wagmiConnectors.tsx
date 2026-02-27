import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  ledgerWallet,
  metaMaskWallet,
  rainbowWallet,
  safeWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { rainbowkitBurnerWallet } from "burner-connector";
import * as chains from "viem/chains";
import scaffoldConfig from "~~/scaffold.config";

const wallets = [metaMaskWallet, walletConnectWallet, ledgerWallet, rainbowWallet, safeWallet];

const isDevNetwork = scaffoldConfig.targetNetworks.some(
  network => (network.id as number) === chains.hederaTestnet.id || (network.id as number) === chains.hardhat.id,
);

/**
 * wagmi connectors for the wagmi context
 */
export const wagmiConnectors = () => {
  if (typeof window === "undefined") {
    return [];
  }

  const walletGroups = [
    {
      groupName: "Supported Wallets",
      wallets,
    },
  ];

  if (scaffoldConfig.enableBurnerWallet && isDevNetwork) {
    walletGroups.push({
      groupName: "Development",
      wallets: [rainbowkitBurnerWallet],
    });
  }

  return connectorsForWallets(walletGroups, {
    appName: "scaffold-hbar",
    projectId: scaffoldConfig.walletConnectProjectId,
  });
};
