"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HederaAddressInput } from "@scaffold-ui/components";
import type { Address } from "viem";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";

/** Chain ID for Hedera resolution: use target network if Hedera, else testnet. */
function hederaChainIdForResolution(networkId: number): number {
  if (networkId === 295 || networkId === 296) return networkId;
  return 296;
}

export const LookUpAddress = () => {
  const [inputValue, setInputValue] = useState("");
  const [resolvedAddress, setResolvedAddress] = useState<Address | undefined>(undefined);
  const router = useRouter();
  const { targetNetwork } = useTargetNetwork();
  const chainId = hederaChainIdForResolution(targetNetwork.id);

  const handleView = () => {
    if (resolvedAddress) router.push(`/blockexplorer/address/${resolvedAddress}`);
  };

  return (
    <div className="flex flex-col gap-2 mb-5 mx-5 p-4 rounded-lg bg-base-200/50 border border-base-300">
      <span className="text-sm font-medium text-base-content/80">Look up address (Hedera account ID or EVM)</span>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[200px] flex-1 max-w-md">
          <HederaAddressInput
            value={inputValue}
            onChange={addr => {
              setResolvedAddress(addr);
              setInputValue(addr);
            }}
            chainId={chainId}
            placeholder="0x... or 0.0.12345"
          />
        </div>
        <button type="button" className="btn btn-sm btn-primary" disabled={!resolvedAddress} onClick={handleView}>
          View in block explorer
        </button>
      </div>
    </div>
  );
};
