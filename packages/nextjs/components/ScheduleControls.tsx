"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Address, zeroAddress } from "viem";
import { useWriteContract } from "wagmi";
import { ClockIcon, PlayIcon, StopIcon } from "@heroicons/react/24/outline";
import { useTransactor } from "~~/hooks/scaffold-hbar";
import { VAULT_ABI } from "~~/utils/scaffold-hbar/constants";
import { invalidateVaultQueries } from "~~/utils/scaffold-hbar/invalidateVaultQueries";
import { notification } from "~~/utils/scaffold-hbar/notification";

type ScheduleControlsProps = {
  vaultAddress: Address;
  nextSchedule?: Address;
  hasConfig: boolean;
};

export const ScheduleControls = ({ vaultAddress, nextSchedule, hasConfig }: ScheduleControlsProps) => {
  const queryClient = useQueryClient();
  const writeTx = useTransactor();
  const { writeContractAsync, isPending } = useWriteContract();

  const hasActiveSchedule = !!nextSchedule && nextSchedule !== zeroAddress;

  const handleSchedule = async () => {
    try {
      await writeTx(() =>
        writeContractAsync({
          address: vaultAddress,
          abi: VAULT_ABI,
          functionName: "scheduleNextRun",
        }),
      );
      await invalidateVaultQueries(queryClient);
    } catch {
      notification.error("Failed to schedule. Check vault balance and HSS capacity.");
    }
  };

  const handleCancel = async () => {
    try {
      await writeTx(() =>
        writeContractAsync({
          address: vaultAddress,
          abi: VAULT_ABI,
          functionName: "cancelNextSchedule",
        }),
      );
      await invalidateVaultQueries(queryClient);
    } catch {
      notification.error("Cancel failed — the schedule may have already been executed or expired on Hedera.");
    }
  };

  const handleRunNow = async () => {
    try {
      await writeTx(() =>
        writeContractAsync({
          address: vaultAddress,
          abi: VAULT_ABI,
          functionName: "executeScheduled",
        }),
      );
      await invalidateVaultQueries(queryClient);
    } catch {
      notification.error("Execution failed. Check vault balance and token configuration.");
    }
  };

  return (
    <div className="bg-base-100 rounded-2xl shadow-md border border-base-300 p-6">
      <div className="flex items-center gap-2 mb-4">
        <ClockIcon className="h-5 w-5 text-primary" />
        <h3 className="font-bold text-lg">Schedule Controls</h3>
      </div>

      {!hasConfig ? (
        <div className="text-center py-4">
          <p className="text-base-content/60">Configure your DCA strategy first to enable scheduling.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 bg-base-200 rounded-xl p-4">
            <div className={`w-3 h-3 rounded-full ${hasActiveSchedule ? "bg-success animate-pulse" : "bg-base-300"}`} />
            <div>
              <p className="font-medium text-sm">{hasActiveSchedule ? "Schedule Active" : "No Active Schedule"}</p>
              {hasActiveSchedule && <p className="text-xs text-base-content/50 font-mono truncate">{nextSchedule}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button className="btn btn-primary btn-sm" onClick={handleSchedule} disabled={isPending}>
              {isPending ? <span className="loading loading-spinner loading-xs" /> : <PlayIcon className="h-4 w-4" />}
              {hasActiveSchedule ? "Reschedule" : "Start Schedule"}
            </button>

            <button className="btn btn-outline btn-sm" onClick={handleRunNow} disabled={isPending}>
              Run Once Now
            </button>

            <button
              className="btn btn-error btn-outline btn-sm"
              onClick={handleCancel}
              disabled={isPending || !hasActiveSchedule}
            >
              <StopIcon className="h-4 w-4" />
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
