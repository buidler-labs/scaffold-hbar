"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Address, encodeAbiParameters, formatUnits, maxUint256, parseUnits } from "viem";
import { useChainId, useWriteContract } from "wagmi";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";
import { useTransactor } from "~~/hooks/scaffold-hbar";
import { DCAConfig } from "~~/hooks/scaffold-hbar/useVaultData";
import {
  DCA_CONFIG_PARAMS,
  HBAR_TINYBAR_DECIMALS,
  INTERVAL_PRESETS,
  MEMEJOB_ADDRESSES,
  MEME_TOKEN_DECIMALS,
  VAULT_ABI,
} from "~~/utils/scaffold-hbar/constants";
import { invalidateVaultQueries } from "~~/utils/scaffold-hbar/invalidateVaultQueries";

type DCAConfigFormProps = {
  vaultAddress: Address;
  currentConfig?: DCAConfig;
  currentInterval?: bigint;
  hasConfig: boolean;
};

export const DCAConfigForm = ({ vaultAddress, currentConfig, currentInterval, hasConfig }: DCAConfigFormProps) => {
  const queryClient = useQueryClient();
  const chainId = useChainId();

  const defaultMemejob = MEMEJOB_ADDRESSES[chainId] ?? "";

  const [memejobAddress, setMemejobAddress] = useState(hasConfig ? currentConfig!.memejob : defaultMemejob);
  const [memeToken, setMemeToken] = useState(hasConfig ? currentConfig!.memeToken : "");
  const [isBuy, setIsBuy] = useState<boolean>(currentConfig?.isBuy ?? true);
  const [amountPerRun, setAmountPerRun] = useState(
    hasConfig ? (Number(currentConfig!.amountPerRun) / 10 ** MEME_TOKEN_DECIMALS).toString() : "",
  );
  const [maxHbarIn, setMaxHbarIn] = useState(
    hasConfig && currentConfig!.maxHbarIn !== maxUint256
      ? formatUnits(currentConfig!.maxHbarIn, HBAR_TINYBAR_DECIMALS)
      : "",
  );
  const [intervalSeconds, setIntervalSeconds] = useState<number>(
    hasConfig && currentInterval ? Number(currentInterval) : INTERVAL_PRESETS[3].seconds,
  );
  const [customInterval, setCustomInterval] = useState("");
  const [useCustomInterval, setUseCustomInterval] = useState(false);

  const writeTx = useTransactor();
  const { writeContractAsync, isPending } = useWriteContract();

  const handleConfigure = async () => {
    const tokenAddr = memeToken as Address;
    const memejob = memejobAddress as Address;
    const amount = parseUnits(amountPerRun, MEME_TOKEN_DECIMALS);
    const interval = useCustomInterval ? BigInt(Number(customInterval)) : BigInt(intervalSeconds);
    const maxHbar = isBuy && maxHbarIn ? parseUnits(maxHbarIn, HBAR_TINYBAR_DECIMALS) : maxUint256;

    const configBytes = encodeAbiParameters(DCA_CONFIG_PARAMS, [
      {
        memejob,
        memeToken: tokenAddr,
        isBuy,
        amountPerRun: amount,
        maxHbarIn: maxHbar,
      },
    ]);

    await writeTx(() =>
      writeContractAsync({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: "configure",
        args: [configBytes, interval],
      }),
    );
    await invalidateVaultQueries(queryClient);
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
            <span className="label-text font-medium">MemeJob Contract</span>
          </label>
          <input
            type="text"
            placeholder="0x..."
            className="input input-bordered w-full font-mono text-sm"
            value={memejobAddress}
            onChange={e => setMemejobAddress(e.target.value)}
          />
        </div>

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
              className={`btn btn-sm flex-1 ${isBuy ? "btn-success" : "btn-outline"}`}
              onClick={() => setIsBuy(true)}
              type="button"
            >
              BUY (HBAR &rarr; Token)
            </button>
            <button
              className={`btn btn-sm flex-1 ${!isBuy ? "btn-warning" : "btn-outline"}`}
              onClick={() => setIsBuy(false)}
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

        {isBuy && (
          <div className="form-control">
            <label className="label py-1">
              <span className="label-text font-medium">Max HBAR / run</span>
              <span className="label-text-alt text-xs">slippage; empty = no limit</span>
            </label>
            <input
              type="number"
              placeholder="0"
              className="input input-bordered w-full"
              value={maxHbarIn}
              onChange={e => setMaxHbarIn(e.target.value)}
              min="0"
              step="any"
            />
          </div>
        )}

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
              <span className="text-sm text-base-content/60">seconds</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {INTERVAL_PRESETS.map(preset => (
                <button
                  key={preset.seconds}
                  className={`btn btn-sm whitespace-nowrap text-xs sm:text-sm ${intervalSeconds === preset.seconds ? "btn-primary" : "btn-outline"}`}
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
          disabled={isPending || !memeToken || !amountPerRun || !memejobAddress}
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
