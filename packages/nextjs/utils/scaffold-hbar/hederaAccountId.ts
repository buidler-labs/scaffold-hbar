export type HederaNetwork = "testnet" | "mainnet";

type AccountIdResponse = { accountId: string | null } | { error: string };

const CHAIN_ID_TO_NETWORK: Record<number, HederaNetwork> = {
  295: "mainnet",
  296: "testnet",
};

/** Maps a viem/wagmi chain ID to "testnet" | "mainnet". Defaults to "testnet". */
export function chainIdToHederaNetwork(chainId: number): HederaNetwork {
  return CHAIN_ID_TO_NETWORK[chainId] ?? "testnet";
}

/**
 * Returns the Hedera account ID (e.g. "0.0.8041897") for an EVM address.
 *
 * @param evmAddress - EVM address (0x...)
 * @param network - "testnet" (default) or "mainnet"
 * @returns Hedera account ID or null if not found
 */
export async function getHederaAccountId(
  evmAddress: string,
  network: HederaNetwork = "testnet",
): Promise<string | null> {
  const params = new URLSearchParams({ evm: evmAddress, network });
  const res = await fetch(`/api/hedera/account?${params}`);

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as AccountIdResponse;
    if ("error" in body) throw new Error(body.error);
    return null;
  }

  const data = (await res.json()) as AccountIdResponse;
  if ("error" in data) throw new Error(data.error);
  return data.accountId;
}
