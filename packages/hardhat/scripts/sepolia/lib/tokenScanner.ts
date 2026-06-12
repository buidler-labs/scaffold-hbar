/**
 * Queries the Etherscan API for all ERC-20 tokens ever transferred to/from a contract,
 * then filters to those with a non-zero current balance.
 *
 * Falls back to a default token list when ETHERSCAN_API_KEY is not set.
 */

import { ethers } from "ethers";

const ERC20_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

const ETHERSCAN_SEPOLIA_API = "https://api-sepolia.etherscan.io/api";

// Sepolia USDC — used as the fallback when Etherscan is unavailable
const FALLBACK_TOKENS = ["0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"];

interface TokenBalance {
  address: string;
  symbol: string;
  decimals: number;
  balance: bigint;
}

interface EtherscanTokenTx {
  contractAddress: string;
  tokenSymbol: string;
  tokenDecimal: string;
}

interface EtherscanResponse {
  status: string;
  result: EtherscanTokenTx[] | string;
}

async function fetchTokenAddresses(contractAddr: string, apiKey: string): Promise<string[]> {
  const url =
    `${ETHERSCAN_SEPOLIA_API}?module=account&action=tokentx` +
    `&address=${contractAddr}&startblock=0&endblock=99999999&sort=asc&apikey=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Etherscan request failed: ${res.status} ${res.statusText}`);

  const data = (await res.json()) as EtherscanResponse;
  if (data.status !== "1") {
    return [];
  }

  const txs = data.result as EtherscanTokenTx[];
  const seen = new Set<string>();
  for (const tx of txs) seen.add(tx.contractAddress.toLowerCase());
  return Array.from(seen);
}

export async function getTokensWithBalance(
  contractAddr: string,
  provider: ethers.JsonRpcProvider,
): Promise<TokenBalance[]> {
  const apiKey = process.env.ETHERSCAN_API_KEY;

  let tokenAddresses: string[];
  if (apiKey) {
    console.log("  Scanning token history via Etherscan...");
    tokenAddresses = await fetchTokenAddresses(contractAddr, apiKey);
    if (tokenAddresses.length === 0) {
      console.log("  No token transfer history found — checking fallback token list.");
      tokenAddresses = FALLBACK_TOKENS;
    }
  } else {
    console.log("  ETHERSCAN_API_KEY not set — checking fallback token list.");
    tokenAddresses = FALLBACK_TOKENS;
  }

  const results: TokenBalance[] = [];
  for (const addr of tokenAddresses) {
    const token = new ethers.Contract(addr, ERC20_ABI, provider);
    const [balance, symbol, decimals] = await Promise.all([
      token.balanceOf(contractAddr) as Promise<bigint>,
      token.symbol() as Promise<string>,
      token.decimals() as Promise<number>,
    ]);
    if (balance > 0n) results.push({ address: addr, symbol, decimals, balance });
  }
  return results;
}
