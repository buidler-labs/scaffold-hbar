import externalContracts from "~~/contracts/externalContracts";

type VaultAbi = typeof externalContracts extends { 296: { MemejobDCAVault: { abi: infer A } } } ? A : undefined;

export const VAULT_ABI = ((externalContracts as any)?.["296"]?.["MemejobDCAVault"]?.abi as VaultAbi) ?? undefined;

export const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "symbol",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export const INTERVAL_PRESETS = [
  { label: "Every hour", seconds: 3600 },
  { label: "Every 4 hours", seconds: 14_400 },
  { label: "Every 12 hours", seconds: 43_200 },
  { label: "Daily", seconds: 86_400 },
  { label: "Every 3 days", seconds: 259_200 },
  { label: "Weekly", seconds: 604_800 },
] as const;

export const MEME_TOKEN_DECIMALS = 8;

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

export function formatInterval(seconds: number | bigint): string {
  const s = Number(seconds);
  if (s === 0) return "Not set";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86_400) {
    const h = Math.floor(s / 3600);
    return `${h}h`;
  }
  if (s < 604_800) {
    const d = Math.floor(s / 86_400);
    return `${d}d`;
  }
  const w = Math.floor(s / 604_800);
  return `${w}w`;
}
