"use client";

import { DCAConfigForm } from "./DCAConfigForm";
import { DepositSection } from "./DepositSection";
import { ScheduleControls } from "./ScheduleControls";
import { VaultStatusCard } from "./VaultStatusCard";
import { WithdrawSection } from "./WithdrawSection";
import { Address } from "viem";
import { useVaultData } from "~~/hooks/scaffold-hbar/useVaultData";

type VaultDashboardProps = {
  vaultAddress: Address;
};

export const VaultDashboard = ({ vaultAddress }: VaultDashboardProps) => {
  const {
    hbarBalance,
    dcaConfig,
    hasConfig,
    intervalSeconds,
    nextSchedule,
    owner,
    strategy,
    consecutiveFailures,
    tokenBalance,
    tokenSymbol,
    tokenDecimals,
    buyCost,
    sellReturn,
    isLoading,
  } = useVaultData(vaultAddress);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <VaultStatusCard
        vaultAddress={vaultAddress}
        hbarBalance={hbarBalance}
        dcaConfig={dcaConfig}
        intervalSeconds={intervalSeconds}
        hasConfig={hasConfig}
        nextSchedule={nextSchedule}
        owner={owner}
        strategy={strategy}
        consecutiveFailures={consecutiveFailures}
        tokenBalance={tokenBalance}
        tokenSymbol={tokenSymbol}
        tokenDecimals={tokenDecimals}
        buyCost={buyCost}
        sellReturn={sellReturn}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DCAConfigForm
          vaultAddress={vaultAddress}
          currentConfig={dcaConfig}
          currentInterval={intervalSeconds}
          hasConfig={hasConfig}
        />

        <div className="flex flex-col gap-6">
          <DepositSection
            vaultAddress={vaultAddress}
            hasConfig={hasConfig}
            memeToken={dcaConfig?.memeToken}
            tokenSymbol={tokenSymbol}
            tokenDecimals={tokenDecimals}
          />
          <WithdrawSection
            vaultAddress={vaultAddress}
            hbarBalance={hbarBalance}
            hasConfig={hasConfig}
            memeToken={dcaConfig?.memeToken}
            tokenBalance={tokenBalance}
            tokenSymbol={tokenSymbol}
            tokenDecimals={tokenDecimals}
          />
        </div>
      </div>

      <ScheduleControls vaultAddress={vaultAddress} nextSchedule={nextSchedule} hasConfig={hasConfig} />
    </div>
  );
};
