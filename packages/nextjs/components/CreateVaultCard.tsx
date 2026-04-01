"use client";

import { ShieldCheckIcon } from "@heroicons/react/24/outline";
import { useDeployedContractInfo } from "~~/hooks/scaffold-hbar";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-hbar";

export const CreateVaultCard = () => {
  const { data: strategyInfo } = useDeployedContractInfo("MemejobDCAStrategy");

  const { writeContractAsync, isPending } = useScaffoldWriteContract({
    contractName: "ScheduledVaultFactory",
  });

  const handleCreateVault = async () => {
    if (!strategyInfo?.address) return;
    await writeContractAsync({
      functionName: "createVault",
      args: [strategyInfo.address],
    });
  };

  return (
    <div className="bg-base-100 rounded-2xl shadow-lg p-8 max-w-xl mx-auto border border-base-300">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <ShieldCheckIcon className="h-8 w-8 text-primary" />
        </div>

        <h2 className="text-2xl font-bold">Create Your DCA Vault</h2>

        <p className="text-base-content/70 max-w-md">
          Dollar-Cost Averaging (DCA) lets you automatically buy or sell meme tokens at regular intervals, smoothing out
          price volatility over time.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mt-2">
          <div className="bg-base-200 rounded-xl p-4">
            <div className="text-2xl mb-1">1</div>
            <p className="text-sm font-medium">Create Vault</p>
            <p className="text-xs text-base-content/60">Deploy your personal DCA vault</p>
          </div>
          <div className="bg-base-200 rounded-xl p-4">
            <div className="text-2xl mb-1">2</div>
            <p className="text-sm font-medium">Configure</p>
            <p className="text-xs text-base-content/60">Set token, amount &amp; interval</p>
          </div>
          <div className="bg-base-200 rounded-xl p-4">
            <div className="text-2xl mb-1">3</div>
            <p className="text-sm font-medium">Automate</p>
            <p className="text-xs text-base-content/60">Schedule runs via Hedera HSS</p>
          </div>
        </div>

        <button
          className="btn btn-primary btn-lg mt-4"
          onClick={handleCreateVault}
          disabled={isPending || !strategyInfo?.address}
        >
          {isPending ? (
            <>
              <span className="loading loading-spinner loading-sm" />
              Creating Vault...
            </>
          ) : (
            "Create Vault"
          )}
        </button>
      </div>
    </div>
  );
};
