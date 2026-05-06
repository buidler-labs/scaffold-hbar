"use client";

import { BanknotesIcon } from "@heroicons/react/24/outline";

export const SEPOLIA_FAUCET_URL = "https://cloud.google.com/application/web3/faucet/ethereum/sepolia";

type SepoliaFaucetProps = {
  className?: string;
  label?: string;
  showIcon?: boolean;
};

export const SepoliaFaucet = ({ className, label = "Get Sepolia ETH", showIcon = true }: SepoliaFaucetProps) => {
  const mergedClassName = ["btn btn-primary btn-sm font-normal gap-1 inline-flex items-center", className]
    .filter(Boolean)
    .join(" ");

  return (
    <a href={SEPOLIA_FAUCET_URL} target="_blank" rel="noopener noreferrer" className={mergedClassName}>
      {showIcon ? <BanknotesIcon className="h-4 w-4 shrink-0" /> : null}
      <span>{label}</span>
    </a>
  );
};
