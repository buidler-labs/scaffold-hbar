"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AddressInput } from "@scaffold-ui/components";
import { type Address, isAddress } from "viem";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";

const NATIVE_ACCOUNT_ID_REGEX = /^\d+\.\d+\.\d+$/;

/** Chain ID for Hedera resolution: use target network if Hedera, else testnet. */
function hederaChainIdForResolution(networkId: number): number {
  if (networkId === 295 || networkId === 296) return networkId;
  return 296;
}

export const LookUpAddress = () => {
  const [inputValue, setInputValue] = useState("");
  const [resolvedAddress, setResolvedAddress] = useState<Address | undefined>(undefined);
  const [isResolving, setIsResolving] = useState(false);
  const router = useRouter();
  const { targetNetwork } = useTargetNetwork();
  const chainId = hederaChainIdForResolution(targetNetwork.id);

  const resolveInputToAddress = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setResolvedAddress(undefined);
      return;
    }

    if (isAddress(trimmed)) {
      setResolvedAddress(trimmed);
      return;
    }

    if (!NATIVE_ACCOUNT_ID_REGEX.test(trimmed)) {
      setResolvedAddress(undefined);
      return;
    }

    setIsResolving(true);
    try {
      const network = chainId === 295 ? "mainnet" : "testnet";
      const res = await fetch(`/api/hedera/evm-address?accountId=${encodeURIComponent(trimmed)}&network=${network}`);
      const data = (await res.json()) as { evmAddress?: string | null };
      if (data?.evmAddress && isAddress(data.evmAddress)) {
        setResolvedAddress(data.evmAddress);
      } else {
        setResolvedAddress(undefined);
      }
    } catch {
      setResolvedAddress(undefined);
    } finally {
      setIsResolving(false);
    }
  };

  const handleView = () => {
    if (resolvedAddress) router.push(`/blockexplorer/address/${resolvedAddress}`);
  };

  return (
    <div className="flex flex-col gap-2 mb-5 mx-5 p-4 rounded-lg bg-base-200/50 border border-base-300">
      <span className="text-sm font-medium text-base-content/80">Look up address (Hedera account ID or EVM)</span>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[200px] flex-1 max-w-md">
          <AddressInput
            value={inputValue}
            onChange={(addr: string) => {
              setInputValue(addr);
              void resolveInputToAddress(addr);
            }}
            placeholder="0x... or 0.0.12345"
          />
        </div>
        <button
          type="button"
          className="btn btn-sm btn-primary"
          disabled={!resolvedAddress || isResolving}
          onClick={handleView}
        >
          {isResolving ? "Resolving..." : "View in block explorer"}
        </button>
      </div>
    </div>
  );
};
