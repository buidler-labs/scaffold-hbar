/**
 * Server-side badge airdrop logic.
 *
 * After a proof is posted, call `tryAwardBadge` to check whether the author
 * has hit a milestone and deserves a badge airdrop.
 *
 * Milestones: 1st proof, 5th, 10th, 25th, 50th, 100th (configurable).
 * Each milestone awards 1 badge token.
 */
import { AccountId, TokenAirdropTransaction, TokenId, TransferTransaction } from "@hiero-ledger/sdk";
import { getHederaClient } from "~~/services/hederaClient";
import { getMirrorBaseUrl } from "~~/services/mirrorNode";

const BADGE_MILESTONES = [1, 5, 10, 25, 50, 100];

export type BadgeResult = {
  awarded: boolean;
  milestone?: number;
  proofCount?: number;
  transactionId?: string;
  error?: string;
};

/**
 * Count how many HCS messages in `topicId` were authored by `authorAddress`.
 * Paginate through all messages (Mirror Node caps at 100 per page).
 */
async function countAuthorProofs(topicId: string, authorAddress: string, network: string): Promise<number> {
  const base = getMirrorBaseUrl(network);
  const lower = authorAddress.toLowerCase();
  let count = 0;
  let nextUrl: string | null = `${base}/api/v1/topics/${topicId}/messages?limit=100&order=asc`;

  while (nextUrl) {
    const res = await fetch(nextUrl, { cache: "no-store" });
    if (!res.ok) break;
    const data = (await res.json()) as {
      messages?: { message?: string }[];
      links?: { next: string | null };
    };

    for (const msg of data.messages ?? []) {
      try {
        if (!msg.message) continue;
        const decoded = Buffer.from(msg.message, "base64").toString("utf-8");
        const payload = JSON.parse(decoded) as { author?: string };
        if (payload.author?.toLowerCase() === lower) count++;
      } catch {
        // skip malformed messages
      }
    }

    const rawNext = data.links?.next ?? null;
    nextUrl = rawNext ? `${base}${rawNext}` : null;
  }

  return count;
}

/**
 * Resolve an EVM address (0x…) to a Hedera account ID (0.0.x) via Mirror Node.
 * Returns null if not found.
 */
async function resolveEvmToAccountId(evmAddress: string, network: string): Promise<string | null> {
  const base = getMirrorBaseUrl(network);
  try {
    const res = await fetch(`${base}/api/v1/accounts/${evmAddress}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { account?: string };
    return data.account ?? null;
  } catch {
    return null;
  }
}

/**
 * Execute the actual token airdrop (1 badge) from operator treasury to recipient.
 */
async function executeAirdrop(tokenId: string, recipientAccountId: string): Promise<{ transactionId: string }> {
  const client = getHederaClient();
  const parsedTokenId = TokenId.fromString(tokenId);
  const parsedRecipient = AccountId.fromString(recipientAccountId);

  let response;
  try {
    response = await new TokenAirdropTransaction()
      .addTokenTransfer(parsedTokenId, client.operatorAccountId!, -1)
      .addTokenTransfer(parsedTokenId, parsedRecipient, 1)
      .execute(client);
  } catch {
    response = await new TransferTransaction()
      .addTokenTransfer(parsedTokenId, client.operatorAccountId!, -1)
      .addTokenTransfer(parsedTokenId, parsedRecipient, 1)
      .execute(client);
  }

  await response.getReceipt(client);
  return { transactionId: response.transactionId.toString() };
}

/**
 * Check if the author just hit a badge milestone and airdrop if so.
 *
 * Call this AFTER a successful HCS message submission. It's fire-and-forget
 * safe — errors are caught and returned in the result, never thrown.
 */
export async function tryAwardBadge(
  topicId: string,
  authorAddress: string | null | undefined,
  badgeTokenId: string | undefined,
  network: string = "testnet",
): Promise<BadgeResult> {
  if (!authorAddress || !badgeTokenId) {
    return { awarded: false };
  }

  try {
    const proofCount = await countAuthorProofs(topicId, authorAddress, network);

    if (!BADGE_MILESTONES.includes(proofCount)) {
      return { awarded: false, proofCount };
    }

    const isEvm = authorAddress.startsWith("0x");
    const recipientAccountId = isEvm ? await resolveEvmToAccountId(authorAddress, network) : authorAddress;

    if (!recipientAccountId) {
      return { awarded: false, proofCount, error: "Could not resolve author to Hedera account ID" };
    }

    const { transactionId } = await executeAirdrop(badgeTokenId, recipientAccountId);

    console.log(
      `[badge] Awarded badge to ${recipientAccountId} (milestone: ${proofCount} proofs, tx: ${transactionId})`,
    );

    return {
      awarded: true,
      milestone: proofCount,
      proofCount,
      transactionId,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[badge] Award failed:", msg);
    return { awarded: false, error: msg };
  }
}
