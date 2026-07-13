/**
 * Typed shapes for JSON bodies returned by Hedera Mirror REST and our /api/hedera routes.
 * Use `as SomeType` immediately after `await response.json()` / `await req.json()`.
 */

// --- Mirror Node REST (subset used by this app) ---

export type MirrorAccountResponse = {
  account?: string;
  evm_address?: string;
  alias?: string;
};

export type MirrorTokenRow = {
  token_id?: string;
  balance?: number;
};

export type MirrorAccountTokensResponse = {
  tokens?: MirrorTokenRow[];
};

// --- Next.js /api/hedera/* ---

/** Successful GET /api/hedera/account */
export type HederaAccountLookupApiResponse = {
  accountId: string | null;
};

/** Successful GET /api/hedera/token-balance */
export type HederaTokenBalanceApiResponse = {
  balance: number;
  accountId?: string;
  tokenId?: string;
};

/** POST /api/hedera/check-badge */
export type CheckBadgeRequestBody = {
  topicId?: string;
  author?: string;
};

/** POST /api/hedera/airdrop */
export type AirdropRequestBody = {
  tokenId: string;
  recipientAccountId: string;
  amount: string;
};

// --- HCS message payload (JSON inside base64 topic message) ---

export type ProofWallMessagePayload = {
  author?: string;
};
