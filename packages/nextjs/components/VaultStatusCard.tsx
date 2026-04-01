"use client";

import { Address, formatEther, formatUnits, zeroAddress } from "viem";
import { DCAConfig } from "~~/hooks/scaffold-hbar/useVaultData";
import { MEME_TOKEN_DECIMALS, formatInterval } from "~~/utils/scaffold-hbar/constants";

type VaultStatusCardProps = {
  vaultAddress: Address;
  hbarBalance?: { value: bigint; decimals: number; formatted: string; symbol: string };
  dcaConfig?: DCAConfig;
  intervalSeconds?: bigint;
  hasConfig: boolean;
  nextSchedule?: Address;
  owner?: Address;
  strategy?: Address;
  consecutiveFailures?: bigint;
  tokenBalance?: bigint;
  tokenSymbol?: string;
  tokenDecimals?: number;
  buyCost?: bigint;
  sellReturn?: bigint;
};

export const VaultStatusCard = ({
  vaultAddress,
  hbarBalance,
  dcaConfig,
  intervalSeconds,
  hasConfig,
  nextSchedule,
  strategy,
  consecutiveFailures,
  tokenBalance,
  tokenSymbol,
  tokenDecimals,
  buyCost,
  sellReturn,
}: VaultStatusCardProps) => {
  const hasActiveSchedule = !!nextSchedule && nextSchedule !== zeroAddress;
  const decimals = tokenDecimals ?? MEME_TOKEN_DECIMALS;
  const failures = consecutiveFailures ? Number(consecutiveFailures) : 0;

  return (
    <div className="bg-base-100 rounded-2xl shadow-md border border-base-300 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">Vault Overview</h3>
        <div className="flex items-center gap-2">
          {failures > 0 && (
            <div className="badge badge-error gap-1">
              {failures} failure{failures > 1 ? "s" : ""}
            </div>
          )}
          {hasActiveSchedule ? (
            <div className="badge badge-success gap-1">
              <span className="w-2 h-2 rounded-full bg-success-content animate-pulse" />
              DCA Active
            </div>
          ) : hasConfig ? (
            <div className="badge badge-warning gap-1">Paused</div>
          ) : (
            <div className="badge badge-ghost gap-1">Not Configured</div>
          )}
        </div>
      </div>

      <div className="text-xs text-base-content/50 font-mono mb-1 truncate">Vault: {vaultAddress}</div>
      {strategy && <div className="text-xs text-base-content/50 font-mono mb-4 truncate">Strategy: {strategy}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-base-200 rounded-xl p-4">
          <p className="text-xs text-base-content/60 uppercase tracking-wider mb-1">HBAR Balance</p>
          <p className="text-xl font-bold">{hbarBalance ? Number(hbarBalance.formatted).toFixed(4) : "0"}</p>
          <p className="text-xs text-base-content/50">HBAR</p>
        </div>

        <div className="bg-base-200 rounded-xl p-4">
          <p className="text-xs text-base-content/60 uppercase tracking-wider mb-1">Token Balance</p>
          <p className="text-xl font-bold">
            {hasConfig && tokenBalance !== undefined ? formatUnits(tokenBalance, decimals) : "—"}
          </p>
          <p className="text-xs text-base-content/50">{tokenSymbol ?? "N/A"}</p>
        </div>

        <div className="bg-base-200 rounded-xl p-4">
          <p className="text-xs text-base-content/60 uppercase tracking-wider mb-1">Mode</p>
          <p className="text-xl font-bold">{hasConfig ? (dcaConfig!.isBuy ? "BUY" : "SELL") : "—"}</p>
          <p className="text-xs text-base-content/50">
            {hasConfig ? `${formatUnits(dcaConfig!.amountPerRun, decimals)} / run` : "Not set"}
          </p>
        </div>

        <div className="bg-base-200 rounded-xl p-4">
          <p className="text-xs text-base-content/60 uppercase tracking-wider mb-1">Interval</p>
          <p className="text-xl font-bold">{hasConfig && intervalSeconds ? formatInterval(intervalSeconds) : "—"}</p>
          <p className="text-xs text-base-content/50">
            {hasConfig && dcaConfig!.isBuy && buyCost
              ? `~${Number(formatEther(buyCost)).toFixed(4)} HBAR/run`
              : hasConfig && !dcaConfig!.isBuy && sellReturn
                ? `~${Number(formatEther(sellReturn)).toFixed(4)} HBAR/run`
                : "Per execution"}
          </p>
        </div>
      </div>
    </div>
  );
};
