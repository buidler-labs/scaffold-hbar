import { NextResponse } from "next/server";
import { tryAwardBadge } from "~~/services/badgeService";
import { hasOperatorKey } from "~~/services/hederaClient";
import type { CheckBadgeRequestBody } from "~~/types/hederaFetchJson";

const TOPIC_ID_REGEX = /^\d+\.\d+\.\d+$/;
const BADGE_TOKEN_ID = process.env.NEXT_PUBLIC_PROOF_WALL_BADGE_TOKEN_ID ?? "";
const HEDERA_NETWORK = (process.env.HEDERA_NETWORK ?? "testnet").toLowerCase();

export async function POST(req: Request) {
  if (!hasOperatorKey()) {
    return NextResponse.json(
      {
        error: "Operator key not configured",
        message: "Badge checks require HEDERA_OPERATOR_ID and HEDERA_OPERATOR_PRIVATE_KEY.",
      },
      { status: 503 },
    );
  }

  if (!BADGE_TOKEN_ID) {
    return NextResponse.json(
      {
        awarded: false,
        error: "Badge token ID is not configured",
      },
      { status: 200 },
    );
  }

  let body: CheckBadgeRequestBody;
  try {
    body = (await req.json()) as CheckBadgeRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const topicId = body.topicId?.trim();
  const author = body.author?.trim();
  if (!topicId || !TOPIC_ID_REGEX.test(topicId)) {
    return NextResponse.json({ error: "Invalid topicId: expected format 0.0.xxxxx" }, { status: 400 });
  }
  if (!author) {
    return NextResponse.json({ error: "author is required" }, { status: 400 });
  }

  const result = await tryAwardBadge(topicId, author, BADGE_TOKEN_ID, HEDERA_NETWORK);
  return NextResponse.json(result);
}
