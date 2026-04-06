/**
 * Mirror Node REST API service layer.
 * All reads from Hedera (topic messages, tokens, accounts) go through this module.
 * No Hedera SDK required — HTTP only.
 */

const MIRROR_BASE: Record<string, string> = {
  testnet: process.env.HEDERA_MIRROR_TESTNET_URL ?? "https://testnet.mirrornode.hedera.com",
  mainnet: process.env.HEDERA_MIRROR_MAINNET_URL ?? "https://mainnet.mirrornode.hedera.com",
  previewnet: process.env.HEDERA_MIRROR_PREVIEWNET_URL ?? "https://previewnet.mirrornode.hedera.com",
};

export type MirrorNetwork = "testnet" | "mainnet" | "previewnet";

export function getMirrorBaseUrl(network: string = "testnet"): string {
  const key = network.toLowerCase();
  return MIRROR_BASE[key] ?? MIRROR_BASE.testnet;
}

/** Single topic message from GET /api/v1/topics/{id}/messages */
export type MirrorTopicMessage = {
  consensus_timestamp: string;
  topic_id: string;
  message: string; // base64-encoded payload
  running_hash: string;
  running_hash_version: number;
  sequence_number: number;
  chunk_info?: {
    initial_transaction_id: string;
    number: number;
    total: number;
  };
};

/** Response from GET /api/v1/topics/{id}/messages */
export type TopicMessagesResponse = {
  messages: MirrorTopicMessage[];
  links?: {
    next: string | null;
  };
};

export type FetchTopicMessagesOptions = {
  network?: string;
  limit?: number;
  order?: "asc" | "desc";
  /** Return messages with sequence_number >= value (inclusive). */
  sequenceNumber?: number;
  /** Return messages with consensus_timestamp >= value (e.g. "1234567890.000000001"). */
  timestamp?: string;
  /** Extra `fetch` init (e.g. Next.js `next: { revalidate }`, `cache`, headers). */
  fetchOptions?: RequestInit;
  /** Abort signal; merged into the fetch init and overrides `fetchOptions.signal` when set. */
  signal?: AbortSignal;
};

const TOPIC_ID_REGEX = /^\d+\.\d+\.\d+$/;

function assertValidTopicId(topicId: string): void {
  if (!topicId || !TOPIC_ID_REGEX.test(topicId)) {
    throw new Error(`Invalid topic ID: expected format 0.0.xxxxx, got ${topicId}`);
  }
}

/**
 * Fetch topic messages from the Mirror Node REST API.
 * @param topicId - HCS topic ID (e.g. "0.0.12345")
 * @param options - limit, order, optional sequence/timestamp filters, optional `fetch` init / signal
 */
export async function fetchTopicMessages(
  topicId: string,
  options: FetchTopicMessagesOptions = {},
): Promise<TopicMessagesResponse> {
  assertValidTopicId(topicId);

  const { network = "testnet", limit = 50, order = "desc", sequenceNumber, timestamp, fetchOptions, signal } = options;

  const base = getMirrorBaseUrl(network);
  const params = new URLSearchParams();
  params.set("limit", String(Math.min(Math.max(1, limit), 100)));
  params.set("order", order);
  if (sequenceNumber != null) params.set("sequencenumber", String(sequenceNumber));
  if (timestamp) params.set("timestamp", timestamp);

  const url = `${base}/api/v1/topics/${topicId}/messages?${params.toString()}`;
  const res = await fetch(url, {
    ...fetchOptions,
    ...(signal !== undefined ? { signal } : {}),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Mirror node error ${res.status}: ${text || res.statusText}`);
  }

  const data = (await res.json()) as TopicMessagesResponse;
  return {
    messages: data.messages ?? [],
    links: data.links ?? { next: null },
  };
}

/**
 * Generic GET against the Mirror Node base URL.
 * Use for future endpoints (accounts, tokens, etc.) with consistent base and error handling.
 * Pass Next.js cache options via `fetchOptions` when calling from a Route Handler.
 */
export async function mirrorGet<T>(
  path: string,
  network: string = "testnet",
  fetchOptions?: RequestInit,
  signal?: AbortSignal,
): Promise<T> {
  const base = getMirrorBaseUrl(network).replace(/\/$/, "");
  const url = path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
  const res = await fetch(url, {
    ...fetchOptions,
    ...(signal !== undefined ? { signal } : {}),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Mirror node error ${res.status}: ${text || res.statusText}`);
  }

  return res.json() as Promise<T>;
}
