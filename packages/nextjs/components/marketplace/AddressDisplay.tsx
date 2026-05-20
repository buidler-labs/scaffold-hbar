"use client";

import { blo } from "blo";

interface AddressDisplayProps {
  address: string;
  size?: "xs" | "sm" | "base";
}

export const AddressDisplay = ({ address, size = "sm" }: AddressDisplayProps) => {
  const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

  const sizeClasses = {
    xs: "text-xs",
    sm: "text-sm",
    base: "text-base",
  };

  const avatarSizes = {
    xs: 16,
    sm: 20,
    base: 24,
  };

  return (
    <div className="flex items-center gap-1.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="rounded-full"
        src={blo(address as `0x${string}`)}
        width={avatarSizes[size]}
        height={avatarSizes[size]}
        alt={`${address} avatar`}
      />
      <span className={`font-mono ${sizeClasses[size]}`}>{shortAddress}</span>
    </div>
  );
};
