"use client";

import { hederaTestnet } from "viem/chains";
import { useAccount } from "wagmi";
import { BanknotesIcon } from "@heroicons/react/24/outline";

/**
 * Links to the Hedera Portal Faucet for testnet HBAR.
 * Only renders when connected to Hedera testnet.
 */
export const Faucet = () => {
  const { chain } = useAccount();

  if (chain?.id !== hederaTestnet.id) {
    return null;
  }

  return (
    <a
      href="https://portal.hedera.com/faucet"
      target="_blank"
      rel="noreferrer"
      className="btn btn-primary btn-sm font-normal gap-1"
    >
      <BanknotesIcon className="h-4 w-4" />
      <span>Get testnet HBAR</span>
    </a>
  );
};
