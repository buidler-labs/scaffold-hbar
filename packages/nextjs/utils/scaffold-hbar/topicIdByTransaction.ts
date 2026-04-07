export type HederaMirrorNetwork = "testnet" | "mainnet";

export type TopicIdResolutionStatus = {
  topicId: string | null;
  pending: boolean;
  mirrorStatus: number | null;
};

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export const MIRROR_RETRY_DELAYS_MS = [300, 700, 1200];

export function toMirrorTransactionId(transactionId: string): string {
  const [accountId, validStart] = transactionId.split("@");
  if (!accountId || !validStart) {
    throw new Error("Invalid transactionId format");
  }

  const [seconds, nanos] = validStart.split(".");
  if (!seconds || !nanos) {
    throw new Error("Invalid transactionId timestamp");
  }

  return `${accountId}-${seconds}-${nanos}`;
}

export async function resolveTopicIdFromMirrorTransaction(args: {
  mirrorBaseUrl: string;
  transactionId: string;
  fetchFn: FetchLike;
  delaysMs?: number[];
}): Promise<TopicIdResolutionStatus> {
  const { mirrorBaseUrl, transactionId, fetchFn, delaysMs = MIRROR_RETRY_DELAYS_MS } = args;
  const mirrorTxId = toMirrorTransactionId(transactionId);
  const base = mirrorBaseUrl.replace(/\/$/, "");
  const url = `${base}/api/v1/transactions/${encodeURIComponent(mirrorTxId)}`;

  let mirrorStatus: number | null = null;

  for (let i = 0; i <= delaysMs.length; i++) {
    const res = await fetchFn(url, { cache: "no-store" });
    mirrorStatus = res.status;
    if (res.ok) {
      const data = (await res.json()) as { transactions?: Array<{ entity_id?: string | null }> };
      const topicId = data.transactions?.[0]?.entity_id ?? null;
      return { topicId, pending: topicId == null, mirrorStatus };
    }

    if (i < delaysMs.length) {
      await new Promise(resolve => setTimeout(resolve, delaysMs[i]));
    }
  }

  return { topicId: null, pending: true, mirrorStatus };
}
