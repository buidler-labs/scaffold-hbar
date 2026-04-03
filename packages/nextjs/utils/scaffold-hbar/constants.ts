import externalContracts from "~~/contracts/externalContracts";

export const VAULT_ABI = externalContracts["296"]["ScheduledVault"]["abi"];

export const DCA_CONFIG_PARAMS = [
  {
    type: "tuple",
    components: [
      { name: "memejob", type: "address" },
      { name: "memeToken", type: "address" },
      { name: "isBuy", type: "bool" },
      { name: "amountPerRun", type: "uint256" },
      { name: "maxHbarIn", type: "uint256" },
    ],
  },
] as const;

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

export const MEMEJOB_ABI = [
  {
    type: "function",
    name: "getAmountOut",
    inputs: [
      { name: "tokenAddress", type: "address" },
      { name: "isBuy", type: "bool" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export const MEMEJOB_ADDRESSES: Record<number, `0x${string}`> = {
  296: "0xA3bf9adeC2Fb49fb65C8948Aed71C6bf1c4D61c8",
};

export const INTERVAL_PRESETS = [
  { label: "Every hour", seconds: 3600 },
  { label: "Every 4 hours", seconds: 14_400 },
  { label: "Every 12 hours", seconds: 43_200 },
  { label: "Daily", seconds: 86_400 },
  { label: "Every 3 days", seconds: 259_200 },
  { label: "Weekly", seconds: 604_800 },
] as const;

export const MEME_TOKEN_DECIMALS = 8;

/** HBAR amounts in Solidity / `withdraw(uint256)` (tinybar). */
export const HBAR_TINYBAR_DECIMALS = 8;

export const HBAR_WEIBAR_PER_TINYBAR = 10n ** 10n;

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
