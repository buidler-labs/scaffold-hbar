"use client";

import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { CreateVaultCard } from "~~/components/dca/CreateVaultCard";
import { VaultDashboard } from "~~/components/dca/VaultDashboard";
import { VAULT_ABI } from "~~/components/dca/constants";
import { useUserVaults } from "~~/components/dca/hooks/useUserVaults";

const DCAPage: NextPage = () => {
  const { status } = useAccount();
  const { vaultAddress, hasVault, isLoading: vaultLoading } = useUserVaults();

  const isConnected = status === "connected";
  const isConnecting = status === "reconnecting" || status === "connecting";
  const vaultAbiReady = !!VAULT_ABI;

  return (
    <div className="flex items-center flex-col grow">
      <div className="w-full hedera-gradient dark:bg-none dark:bg-hedera-charcoal py-10 px-5">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Memejob DCA</h1>
          <p className="text-white/70">Dollar-cost average into your favorite meme tokens on Hedera</p>
        </div>
      </div>

      <div className="w-full max-w-4xl mx-auto px-5 -mt-6 pb-16">
        {isConnecting ? (
          <div className="bg-base-100 rounded-2xl shadow-lg p-8 text-center">
            <span className="loading loading-spinner loading-lg" />
            <p className="mt-4 text-base-content/60">Connecting wallet...</p>
          </div>
        ) : !isConnected ? (
          <div className="bg-base-100 rounded-2xl shadow-lg p-8 max-w-lg mx-auto text-center border border-base-300">
            <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
            <p className="text-base-content/70">
              Connect your wallet to create a DCA vault and start automating your meme token strategy.
            </p>
          </div>
        ) : vaultLoading ? (
          <div className="bg-base-100 rounded-2xl shadow-lg p-8 text-center">
            <span className="loading loading-spinner loading-lg" />
            <p className="mt-4 text-base-content/60">Loading vault...</p>
          </div>
        ) : vaultAbiReady && hasVault && vaultAddress ? (
          <VaultDashboard vaultAddress={vaultAddress} />
        ) : (
          <CreateVaultCard />
        )}
      </div>
    </div>
  );
};

export default DCAPage;
