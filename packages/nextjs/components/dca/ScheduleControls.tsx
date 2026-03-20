"use client";

import { useState } from "react";
import { VAULT_ABI } from "./constants";
import { Address, parseEther, zeroAddress } from "viem";
import { useWriteContract } from "wagmi";
import { ClockIcon, PlayIcon, StopIcon } from "@heroicons/react/24/outline";
import { useTransactor } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

type ScheduleControlsProps = {
  vaultAddress: Address;
  nextSchedule?: Address;
  hasConfig: boolean;
  dcaMode?: number;
};

export const ScheduleControls = ({ vaultAddress, nextSchedule, hasConfig, dcaMode }: ScheduleControlsProps) => {
  const [maxHbarIn, setMaxHbarIn] = useState("");

  const writeTx = useTransactor();
  const { writeContractAsync, isPending } = useWriteContract();

  const hasActiveSchedule = !!nextSchedule && nextSchedule !== zeroAddress;
  const isBuyMode = dcaMode === 0;

  const handleSchedule = async () => {
    try {
      const maxHbar = isBuyMode && maxHbarIn ? parseEther(maxHbarIn) : 0n;
      await writeTx(() =>
        writeContractAsync({
          address: vaultAddress,
          abi: VAULT_ABI,
          functionName: "scheduleNextRun",
          args: [maxHbar],
        }),
      );
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
    } catch {
      notification.error("Cancel failed — the schedule may have already been executed or expired on Hedera.");
    }
  };

  const handleRunNow = async () => {
    try {
      const maxHbar = isBuyMode && maxHbarIn ? parseEther(maxHbarIn) : 0n;
      await writeTx(() =>
        writeContractAsync({
          address: vaultAddress,
          abi: VAULT_ABI,
          functionName: "runDCA",
          args: [maxHbar],
        }),
      );
    } catch {
      notification.error("DCA run failed. Check vault balance and token configuration.");
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

          {isBuyMode && (
            <div className="form-control">
              <label className="label">
                <span className="label-text text-sm">Max HBAR per run (slippage protection)</span>
                <span className="label-text-alt text-xs">0 = no limit</span>
              </label>
              <input
                type="number"
                placeholder="0"
                className="input input-bordered input-sm w-full"
                value={maxHbarIn}
                onChange={e => setMaxHbarIn(e.target.value)}
                min="0"
                step="any"
              />
            </div>
          )}

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
