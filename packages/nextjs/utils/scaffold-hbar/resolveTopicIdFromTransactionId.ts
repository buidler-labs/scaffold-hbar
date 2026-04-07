import { HederaMirrorNetwork, TopicIdResolutionStatus } from "./topicIdByTransaction";

export async function resolveTopicIdFromTransactionId(
  transactionId: string,
  network: HederaMirrorNetwork,
): Promise<TopicIdResolutionStatus> {
  const res = await fetch(
    `/api/hedera/topic-id-by-transaction?transactionId=${encodeURIComponent(transactionId)}&network=${encodeURIComponent(network)}`,
    { method: "GET" },
  );
  if (!res.ok) {
    return { topicId: null, pending: true, mirrorStatus: res.status };
  }

  return (await res.json()) as TopicIdResolutionStatus;
}
