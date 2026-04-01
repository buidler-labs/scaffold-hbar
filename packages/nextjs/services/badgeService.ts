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
import { extractIdentity } from "~~/utils/scaffold-hbar/hederaIdentity";

const BADGE_MILESTONES = [1, 5, 10, 25, 50, 100];

function normalizeIdentity(raw: string): string {
  return extractIdentity(raw).toLowerCase();
}

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
  const target = normalizeIdentity(authorAddress);
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
        if (payload.author && normalizeIdentity(payload.author) === target) count++;
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
 * Read current badge token balance for recipient from Mirror Node.
 */
async function getBadgeBalance(tokenId: string, accountId: string, network: string): Promise<number> {
  const base = getMirrorBaseUrl(network);
  try {
    const res = await fetch(
      `${base}/api/v1/accounts/${encodeURIComponent(accountId)}/tokens?token.id=${encodeURIComponent(tokenId)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return 0;
    const data = (await res.json()) as {
      tokens?: { token_id?: string; balance?: number }[];
    };
    const token = (data.tokens ?? []).find(t => t.token_id === tokenId);
    return token?.balance ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Execute token airdrop from operator treasury to recipient.
 */
async function executeAirdrop(
  tokenId: string,
  recipientAccountId: string,
  amount: number,
): Promise<{ transactionId: string }> {
  const client = getHederaClient();
  const parsedTokenId = TokenId.fromString(tokenId);
  const parsedRecipient = AccountId.fromString(recipientAccountId);

  let response;
  try {
    response = await new TokenAirdropTransaction()
      .addTokenTransfer(parsedTokenId, client.operatorAccountId!, -amount)
      .addTokenTransfer(parsedTokenId, parsedRecipient, amount)
      .execute(client);
  } catch {
    response = await new TransferTransaction()
      .addTokenTransfer(parsedTokenId, client.operatorAccountId!, -amount)
      .addTokenTransfer(parsedTokenId, parsedRecipient, amount)
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
    const normalizedAuthor = extractIdentity(authorAddress);
    const proofCount = await countAuthorProofs(topicId, normalizedAuthor, network);
    const eligibleBadgeCount = BADGE_MILESTONES.filter(m => proofCount >= m).length;

    const isEvm = normalizedAuthor.startsWith("0x");
    const recipientAccountId = isEvm ? await resolveEvmToAccountId(normalizedAuthor, network) : normalizedAuthor;

    if (!recipientAccountId) {
      return { awarded: false, proofCount, error: "Could not resolve author to Hedera account ID" };
    }

    const currentBalance = await getBadgeBalance(badgeTokenId, recipientAccountId, network);
    const missingBadges = Math.max(0, eligibleBadgeCount - currentBalance);

    if (missingBadges <= 0) {
      return { awarded: false, proofCount };
    }

    const { transactionId } = await executeAirdrop(badgeTokenId, recipientAccountId, missingBadges);
    const milestone = [...BADGE_MILESTONES].reverse().find(m => proofCount >= m);

    console.log(
      `[badge] Awarded ${missingBadges} badge(s) to ${recipientAccountId} (proofs: ${proofCount}, tx: ${transactionId})`,
    );

    return {
      awarded: true,
      milestone,
      proofCount,
      transactionId,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[badge] Award failed:", msg);
    return { awarded: false, error: msg };
  }
}
