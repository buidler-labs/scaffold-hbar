"use client";

import { blo } from "blo";
import { isEvmAddress } from "~~/utils/scaffold-hbar/identity";

type BlockieAvatarProps = {
  address: string;
  ensImage?: string | null;
  size?: number;
};

function stringHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function fallbackAvatarDataUri(seed: string): string {
  const hash = stringHash(seed);
  const hue = hash % 360;
  const bg = `hsl(${hue} 70% 45%)`;
  const fg = "hsl(0 0% 100%)";
  const initials =
    seed
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 2)
      .toUpperCase() || "H";
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><rect width='64' height='64' rx='32' fill='${bg}'/><text x='50%' y='54%' dominant-baseline='middle' text-anchor='middle' font-family='system-ui, sans-serif' font-size='22' font-weight='700' fill='${fg}'>${initials}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// Generic blockie avatar component independent from wallet UI libs.
export const BlockieAvatar = ({ address, ensImage, size = 24 }: BlockieAvatarProps) => (
  // Don't want to use nextJS Image here (and adding remote patterns for the URL)
  // eslint-disable-next-line @next/next/no-img-element
  <img
    className="rounded-full"
    src={ensImage || (isEvmAddress(address) ? blo(address) : fallbackAvatarDataUri(address))}
    width={size}
    height={size}
    loading="lazy"
    alt={`${address} avatar`}
  />
);
