"use client";

import { useState } from "react";
import { MEME_TOKEN_DECIMALS, VAULT_ABI } from "./constants";
import { Address, formatEther, formatUnits, parseEther, parseUnits } from "viem";
import { useWriteContract } from "wagmi";
import { ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import { useTransactor } from "~~/hooks/scaffold-eth";

type WithdrawSectionProps = {
  vaultAddress: Address;
  hbarBalance?: { value: bigint; decimals: number; formatted: string; symbol: string };
  hasConfig: boolean;
  memeToken?: Address;
  tokenBalance?: bigint;
  tokenSymbol?: string;
  tokenDecimals?: number;
};

export const WithdrawSection = ({
  vaultAddress,
  hbarBalance,
  hasConfig,
  memeToken,
  tokenBalance,
  tokenSymbol,
  tokenDecimals,
}: WithdrawSectionProps) => {
  const [hbarAmount, setHbarAmount] = useState("");
  const [tokenAmount, setTokenAmount] = useState("");
  const [activeTab, setActiveTab] = useState<"hbar" | "token">("hbar");

  const writeTx = useTransactor();
  const { writeContractAsync, isPending } = useWriteContract();

  const decimals = tokenDecimals ?? MEME_TOKEN_DECIMALS;

  const handleWithdrawHbar = async () => {
    const amount = parseEther(hbarAmount);
    await writeTx(() =>
      writeContractAsync({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: "withdraw",
        args: [amount],
      }),
    );
    setHbarAmount("");
  };

  const handleWithdrawTokens = async () => {
    if (!memeToken) return;
    const amount = parseUnits(tokenAmount, decimals);
    await writeTx(() =>
      writeContractAsync({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: "withdrawTokens",
        args: [memeToken, amount],
      }),
    );
    setTokenAmount("");
  };

  const handleMaxHbar = () => {
    if (hbarBalance) {
      setHbarAmount(formatEther(hbarBalance.value));
    }
  };

  const handleMaxTokens = () => {
    if (tokenBalance !== undefined) {
      setTokenAmount(formatUnits(tokenBalance, decimals));
    }
  };

  return (
    <div className="bg-base-100 rounded-2xl shadow-md border border-base-300 p-6 flex-1 flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <ArrowUpTrayIcon className="h-5 w-5 text-error" />
        <h3 className="font-bold text-lg">Withdraw</h3>
      </div>

      <div role="tablist" className="tabs tabs-boxed mb-4">
        <button
          role="tab"
          className={`tab ${activeTab === "hbar" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("hbar")}
        >
          HBAR
        </button>
        <button
          role="tab"
          className={`tab ${activeTab === "token" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("token")}
          disabled={!hasConfig}
        >
          {tokenSymbol ?? "Token"}
        </button>
      </div>

      {activeTab === "hbar" ? (
        <div className="flex flex-col gap-3">
          <div className="form-control">
            <label className="label">
              <span className="label-text text-sm">Amount (HBAR)</span>
              <button className="label-text-alt link link-primary text-xs" onClick={handleMaxHbar} type="button">
                Max: {hbarBalance ? Number(hbarBalance.formatted).toFixed(4) : "0"}
              </button>
            </label>
            <input
              type="number"
              placeholder="0.0"
              className="input input-bordered w-full"
              value={hbarAmount}
              onChange={e => setHbarAmount(e.target.value)}
              min="0"
              step="any"
            />
          </div>
          <button
            className="btn btn-error btn-outline w-full"
            onClick={handleWithdrawHbar}
            disabled={isPending || !hbarAmount || Number(hbarAmount) <= 0}
          >
            {isPending ? (
              <>
                <span className="loading loading-spinner loading-sm" />
                Withdrawing...
              </>
            ) : (
              "Withdraw HBAR"
            )}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="form-control">
            <label className="label">
              <span className="label-text text-sm">Amount ({tokenSymbol ?? "tokens"})</span>
              <button className="label-text-alt link link-primary text-xs" onClick={handleMaxTokens} type="button">
                Max: {tokenBalance !== undefined ? formatUnits(tokenBalance, decimals) : "0"}
              </button>
            </label>
            <input
              type="number"
              placeholder="0"
              className="input input-bordered w-full"
              value={tokenAmount}
              onChange={e => setTokenAmount(e.target.value)}
              min="0"
              step="any"
            />
          </div>
          <button
            className="btn btn-error btn-outline w-full"
            onClick={handleWithdrawTokens}
            disabled={isPending || !tokenAmount || Number(tokenAmount) <= 0}
          >
            {isPending ? (
              <>
                <span className="loading loading-spinner loading-sm" />
                Withdrawing...
              </>
            ) : (
              `Withdraw ${tokenSymbol ?? "Tokens"}`
            )}
          </button>
        </div>
      )}
    </div>
  );
};
