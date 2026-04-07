import { HederaMirrorNetwork, TopicIdResolutionStatus } from "./topicIdByTransaction";

const CLIENT_TOPIC_RESOLUTION_RETRY_DELAYS_MS = [1500, 2500, 3500];

async function sleep(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}

export async function resolveTopicIdFromTransactionId(
  transactionId: string,
  network: HederaMirrorNetwork,
): Promise<TopicIdResolutionStatus> {
  const url = `/api/hedera/topic-id-by-transaction?transactionId=${encodeURIComponent(transactionId)}&network=${encodeURIComponent(network)}`;

  for (let attempt = 0; attempt <= CLIENT_TOPIC_RESOLUTION_RETRY_DELAYS_MS.length; attempt++) {
    const res = await fetch(url, { method: "GET", cache: "no-store" });
    if (!res.ok) {
      return { topicId: null, pending: false, mirrorStatus: res.status };
    }

    const status = (await res.json()) as TopicIdResolutionStatus;
    if (status.topicId || !status.pending || attempt === CLIENT_TOPIC_RESOLUTION_RETRY_DELAYS_MS.length) {
      return status;
    }

    await sleep(CLIENT_TOPIC_RESOLUTION_RETRY_DELAYS_MS[attempt]);
  }

  return { topicId: null, pending: true, mirrorStatus: null };
}
