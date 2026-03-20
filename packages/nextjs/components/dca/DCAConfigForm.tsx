"use client";

import { useState } from "react";
import { INTERVAL_PRESETS, MEME_TOKEN_DECIMALS, VAULT_ABI } from "./constants";
import { Address, parseUnits } from "viem";
import { useWriteContract } from "wagmi";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";
import { useTransactor } from "~~/hooks/scaffold-eth";

type DCAConfigFormProps = {
  vaultAddress: Address;
  currentConfig?: {
    memeToken: Address;
    mode: number;
    amountPerRun: bigint;
    intervalSeconds: bigint;
  };
  hasConfig: boolean;
};

export const DCAConfigForm = ({ vaultAddress, currentConfig, hasConfig }: DCAConfigFormProps) => {
  const [memeToken, setMemeToken] = useState(hasConfig ? currentConfig!.memeToken : "");
  const [mode, setMode] = useState<number>(currentConfig?.mode ?? 0);
  const [amountPerRun, setAmountPerRun] = useState(
    hasConfig ? (Number(currentConfig!.amountPerRun) / 10 ** MEME_TOKEN_DECIMALS).toString() : "",
  );
  const [intervalSeconds, setIntervalSeconds] = useState<number>(
    hasConfig ? Number(currentConfig!.intervalSeconds) : INTERVAL_PRESETS[3].seconds,
  );
  const [customInterval, setCustomInterval] = useState("");
  const [useCustomInterval, setUseCustomInterval] = useState(false);

  const writeTx = useTransactor();
  const { writeContractAsync, isPending } = useWriteContract();

  const handleConfigure = async () => {
    const tokenAddr = memeToken as Address;
    const amount = parseUnits(amountPerRun, MEME_TOKEN_DECIMALS);
    const interval = useCustomInterval ? BigInt(Number(customInterval) * 60) : BigInt(intervalSeconds);

    await writeTx(() =>
      writeContractAsync({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: "configureDCA",
        args: [tokenAddr, mode, amount, interval],
      }),
    );
  };

  return (
    <div className="bg-base-100 rounded-2xl shadow-md border border-base-300 p-6">
      <div className="flex items-center gap-2 mb-4">
        <AdjustmentsHorizontalIcon className="h-5 w-5 text-primary" />
        <h3 className="font-bold text-lg">DCA Strategy</h3>
      </div>

      <div className="flex flex-col gap-4">
        <div className="form-control">
          <label className="label py-1">
            <span className="label-text font-medium">Meme Token Address</span>
          </label>
          <input
            type="text"
            placeholder="0x..."
            className="input input-bordered w-full font-mono text-sm"
            value={memeToken}
            onChange={e => setMemeToken(e.target.value)}
          />
        </div>

        <div className="form-control">
          <label className="label py-1">
            <span className="label-text font-medium">Mode</span>
          </label>
          <div className="flex gap-2">
            <button
              className={`btn btn-sm flex-1 ${mode === 0 ? "btn-success" : "btn-outline"}`}
              onClick={() => setMode(0)}
              type="button"
            >
              BUY (HBAR &rarr; Token)
            </button>
            <button
              className={`btn btn-sm flex-1 ${mode === 1 ? "btn-warning" : "btn-outline"}`}
              onClick={() => setMode(1)}
              type="button"
            >
              SELL (Token &rarr; HBAR)
            </button>
          </div>
        </div>

        <div className="form-control">
          <label className="label py-1">
            <span className="label-text font-medium">Amount Per Run (tokens)</span>
          </label>
          <input
            type="number"
            placeholder="100"
            className="input input-bordered w-full"
            value={amountPerRun}
            onChange={e => setAmountPerRun(e.target.value)}
            min="0"
            step="any"
          />
        </div>

        <div className="form-control">
          <label className="label py-1">
            <span className="label-text font-medium">Interval</span>
            <span className="label-text-alt">
              <label className="cursor-pointer flex items-center gap-1">
                <input
                  type="checkbox"
                  className="checkbox checkbox-xs"
                  checked={useCustomInterval}
                  onChange={e => setUseCustomInterval(e.target.checked)}
                />
                <span className="text-xs">Custom</span>
              </label>
            </span>
          </label>
          {useCustomInterval ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="30"
                className="input input-bordered flex-1"
                value={customInterval}
                onChange={e => setCustomInterval(e.target.value)}
                min="1"
              />
              <span className="text-sm text-base-content/60">minutes</span>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {INTERVAL_PRESETS.map(preset => (
                <button
                  key={preset.seconds}
                  className={`btn btn-sm ${intervalSeconds === preset.seconds ? "btn-primary" : "btn-outline"}`}
                  onClick={() => setIntervalSeconds(preset.seconds)}
                  type="button"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          className="btn btn-primary w-full mt-2"
          onClick={handleConfigure}
          disabled={isPending || !memeToken || !amountPerRun}
        >
          {isPending ? (
            <>
              <span className="loading loading-spinner loading-sm" />
              Configuring...
            </>
          ) : hasConfig ? (
            "Update Configuration"
          ) : (
            "Configure DCA"
          )}
        </button>
      </div>
    </div>
  );
};
