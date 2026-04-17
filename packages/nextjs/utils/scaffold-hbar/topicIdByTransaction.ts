export type HederaMirrorNetwork = "testnet" | "mainnet";

export type TopicIdResolutionStatus = {
  topicId: string | null;
  pending: boolean;
  mirrorStatus: number | null;
};

export type TokenIdResolutionStatus = {
  tokenId: string | null;
  pending: boolean;
  mirrorStatus: number | null;
};

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
type MirrorTransactionRow = {
  entity_id?: string | null;
  result?: string | null;
};

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
}): Promise<TopicIdResolutionStatus> {
  const { mirrorBaseUrl, transactionId, fetchFn } = args;
  const mirrorTxId = toMirrorTransactionId(transactionId);
  const base = mirrorBaseUrl.replace(/\/$/, "");
  const url = `${base}/api/v1/transactions/${encodeURIComponent(mirrorTxId)}`;

  const res = await fetchFn(url, { cache: "no-store" });
  const mirrorStatus = res.status;

  if (res.ok) {
    const data = (await res.json()) as { transactions?: MirrorTransactionRow[] };
    const tx = data.transactions?.[0];
    const topicId = tx?.entity_id ?? null;
    if (topicId) return { topicId, pending: false, mirrorStatus };

    const txResult = tx?.result?.toUpperCase();
    const isFailedFinalResult = Boolean(txResult && txResult !== "SUCCESS");
    return { topicId: null, pending: !isFailedFinalResult, mirrorStatus };
  }

  return { topicId: null, pending: mirrorStatus === 404, mirrorStatus };
}

export async function resolveTokenIdFromMirrorTransaction(args: {
  mirrorBaseUrl: string;
  transactionId: string;
  fetchFn: FetchLike;
}): Promise<TokenIdResolutionStatus> {
  const { mirrorBaseUrl, transactionId, fetchFn } = args;
  const mirrorTxId = toMirrorTransactionId(transactionId);
  const base = mirrorBaseUrl.replace(/\/$/, "");
  const url = `${base}/api/v1/transactions/${encodeURIComponent(mirrorTxId)}`;

  const res = await fetchFn(url, { cache: "no-store" });
  const mirrorStatus = res.status;

  if (res.ok) {
    const data = (await res.json()) as { transactions?: MirrorTransactionRow[] };
    const tx = data.transactions?.[0];
    const tokenId = tx?.entity_id ?? null;
    if (tokenId) return { tokenId, pending: false, mirrorStatus };

    const txResult = tx?.result?.toUpperCase();
    const isFailedFinalResult = Boolean(txResult && txResult !== "SUCCESS");
    return { tokenId: null, pending: !isFailedFinalResult, mirrorStatus };
  }

  return { tokenId: null, pending: mirrorStatus === 404, mirrorStatus };
}
