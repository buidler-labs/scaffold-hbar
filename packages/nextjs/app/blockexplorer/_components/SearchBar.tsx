"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isAddress, isHex } from "viem";
import { hardhat } from "viem/chains";
import { usePublicClient } from "wagmi";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";

const NATIVE_ACCOUNT_ID_REGEX = /^\d+\.\d+\.\d+$/;

export const SearchBar = () => {
  const [searchInput, setSearchInput] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  const router = useRouter();
  const { targetNetwork } = useTargetNetwork();

  const client = usePublicClient({ chainId: hardhat.id });

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = searchInput.trim();
    if (!trimmed) return;

    if (isHex(trimmed)) {
      try {
        const tx = await client?.getTransaction({ hash: trimmed as `0x${string}` });
        if (tx) {
          router.push(`/blockexplorer/transaction/${trimmed}`);
          return;
        }
      } catch (error) {
        console.error("Failed to fetch transaction:", error);
      }
    }

    if (isAddress(trimmed)) {
      router.push(`/blockexplorer/address/${trimmed}`);
      return;
    }

    if (NATIVE_ACCOUNT_ID_REGEX.test(trimmed)) {
      setIsResolving(true);
      try {
        const network = targetNetwork.id === 295 ? "mainnet" : "testnet";
        const res = await fetch(`/api/hedera/evm-address?accountId=${encodeURIComponent(trimmed)}&network=${network}`);
        const data = (await res.json()) as { evmAddress?: string | null; error?: string } | undefined;
        if (data?.evmAddress) {
          router.push(`/blockexplorer/address/${data.evmAddress}`);
          return;
        }
      } catch (e) {
        console.error("Failed to resolve Hedera account ID:", e);
      } finally {
        setIsResolving(false);
      }
    }
  };

  return (
    <form onSubmit={handleSearch} className="flex items-center justify-end mb-5 space-x-3 mx-5">
      <input
        className="border-primary bg-base-100 text-base-content placeholder:text-base-content/50 p-2 mr-2 w-full md:w-1/2 lg:w-1/3 rounded-md shadow-md focus:outline-hidden focus:ring-2 focus:ring-accent"
        type="text"
        value={searchInput}
        placeholder="Search by tx hash, 0x... or 0.0.12345"
        onChange={e => setSearchInput(e.target.value)}
      />
      <button className="btn btn-sm btn-primary" type="submit" disabled={isResolving}>
        {isResolving ? "Resolving…" : "Search"}
      </button>
    </form>
  );
};
