"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Address, parseEther, parseUnits } from "viem";
import { useWriteContract } from "wagmi";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { useTransactor } from "~~/hooks/scaffold-hbar";
import { ERC20_ABI, MEME_TOKEN_DECIMALS, VAULT_ABI } from "~~/utils/scaffold-hbar/constants";
import { invalidateVaultQueries } from "~~/utils/scaffold-hbar/invalidateVaultQueries";

type DepositSectionProps = {
  vaultAddress: Address;
  hasConfig: boolean;
  memeToken?: Address;
  tokenSymbol?: string;
  tokenDecimals?: number;
};

export const DepositSection = ({
  vaultAddress,
  hasConfig,
  memeToken,
  tokenSymbol,
  tokenDecimals,
}: DepositSectionProps) => {
  const queryClient = useQueryClient();
  const [hbarAmount, setHbarAmount] = useState("");
  const [tokenAmount, setTokenAmount] = useState("");
  const [activeTab, setActiveTab] = useState<"hbar" | "token">("hbar");

  const writeTx = useTransactor();
  const { writeContractAsync, isPending } = useWriteContract();

  const handleDepositHbar = async () => {
    const value = parseEther(hbarAmount);
    await writeTx(() =>
      writeContractAsync({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: "deposit",
        value,
      }),
    );
    await invalidateVaultQueries(queryClient);
    setHbarAmount("");
  };

  const handleDepositTokens = async () => {
    if (!memeToken) return;
    const decimals = tokenDecimals ?? MEME_TOKEN_DECIMALS;
    const amount = parseUnits(tokenAmount, decimals);

    await writeTx(() =>
      writeContractAsync({
        address: memeToken,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [vaultAddress, amount],
      }),
    );

    await writeTx(() =>
      writeContractAsync({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: "depositTokens",
        args: [memeToken, amount],
      }),
    );
    await invalidateVaultQueries(queryClient);
    setTokenAmount("");
  };

  return (
    <div className="bg-base-100 rounded-2xl shadow-md border border-base-300 p-6 flex-1 flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <ArrowDownTrayIcon className="h-5 w-5 text-success" />
        <h3 className="font-bold text-lg">Deposit</h3>
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
            className="btn btn-success w-full"
            onClick={handleDepositHbar}
            disabled={isPending || !hbarAmount || Number(hbarAmount) <= 0}
          >
            {isPending ? (
              <>
                <span className="loading loading-spinner loading-sm" />
                Depositing...
              </>
            ) : (
              "Deposit HBAR"
            )}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="form-control">
            <label className="label">
              <span className="label-text text-sm">Amount ({tokenSymbol ?? "tokens"})</span>
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
          <p className="text-xs text-base-content/50">Requires approval before deposit.</p>
          <button
            className="btn btn-success w-full"
            onClick={handleDepositTokens}
            disabled={isPending || !tokenAmount || Number(tokenAmount) <= 0}
          >
            {isPending ? (
              <>
                <span className="loading loading-spinner loading-sm" />
                Processing...
              </>
            ) : (
              `Approve & Deposit ${tokenSymbol ?? "Tokens"}`
            )}
          </button>
        </div>
      )}
    </div>
  );
};
