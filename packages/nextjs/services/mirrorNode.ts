/**
 * Mirror Node REST API helpers.
 * Used for reading topic messages, token info, account info (no SDK required).
 */

const MIRROR_BASE: Record<string, string> = {
  testnet: process.env.HEDERA_MIRROR_TESTNET_URL ?? "https://testnet.mirrornode.hedera.com",
  mainnet: process.env.HEDERA_MIRROR_MAINNET_URL ?? "https://mainnet.mirrornode.hedera.com",
};

export function getMirrorBaseUrl(network: string = "testnet"): string {
  return MIRROR_BASE[network] ?? MIRROR_BASE.testnet;
}

export async function fetchTopicMessages(
  topicId: string,
  network: string = "testnet",
  limit: number = 50,
): Promise<{ messages: unknown[] }> {
  const base = getMirrorBaseUrl(network);
  const url = `${base}/api/v1/topics/${topicId}/messages?limit=${limit}&order=desc`;
  const res = await fetch(url, { next: { revalidate: 30 } });
  if (!res.ok) throw new Error(`Mirror node error: ${res.status}`);
  const data = (await res.json()) as { messages?: unknown[] };
  return { messages: data.messages ?? [] };
}
