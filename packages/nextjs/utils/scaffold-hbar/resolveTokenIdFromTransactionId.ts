import { HederaMirrorNetwork, TokenIdResolutionStatus } from "./topicIdByTransaction";

const CLIENT_TOKEN_RESOLUTION_RETRY_DELAYS_MS = [1500, 2500, 3500];

async function sleep(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}

export async function resolveTokenIdFromTransactionId(
  transactionId: string,
  network: HederaMirrorNetwork,
): Promise<TokenIdResolutionStatus> {
  const url = `/api/hedera/token-id-by-transaction?transactionId=${encodeURIComponent(transactionId)}&network=${encodeURIComponent(network)}`;

  for (let attempt = 0; attempt <= CLIENT_TOKEN_RESOLUTION_RETRY_DELAYS_MS.length; attempt++) {
    const res = await fetch(url, { method: "GET", cache: "no-store" });
    if (!res.ok) {
      return { tokenId: null, pending: false, mirrorStatus: res.status };
    }

    const status = (await res.json()) as TokenIdResolutionStatus;
    if (status.tokenId || !status.pending || attempt === CLIENT_TOKEN_RESOLUTION_RETRY_DELAYS_MS.length) {
      return status;
    }

    await sleep(CLIENT_TOKEN_RESOLUTION_RETRY_DELAYS_MS[attempt]);
  }

  return { tokenId: null, pending: true, mirrorStatus: null };
}
