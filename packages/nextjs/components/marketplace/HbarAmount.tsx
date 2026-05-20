"use client";

import { formatHbar } from "~~/utils/hedera";

interface HbarAmountProps {
  tinybars: bigint;
  decimals?: number;
  showSymbol?: boolean;
  className?: string;
}

export const HbarAmount = ({ tinybars, decimals = 2, showSymbol = true, className = "" }: HbarAmountProps) => {
  const formatted = formatHbar(tinybars, decimals);

  return (
    <span className={`font-mono ${className}`}>
      {formatted}
      {showSymbol && <span className="text-primary ml-1">HBAR</span>}
    </span>
  );
};

interface HbarPricePerDayProps {
  tinybars: bigint;
  className?: string;
}

export const HbarPricePerDay = ({ tinybars, className = "" }: HbarPricePerDayProps) => {
  return (
    <span className={className}>
      <HbarAmount tinybars={tinybars} /> <span className="text-base-content/60">/day</span>
    </span>
  );
};
