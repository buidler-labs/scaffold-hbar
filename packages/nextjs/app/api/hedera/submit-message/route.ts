import { NextResponse } from "next/server";
import { TopicId, TopicMessageSubmitTransaction } from "@hiero-ledger/sdk";
import { getHederaClient, hasOperatorKey } from "~~/services/hederaClient";

/** Hedera HCS topic message max size (1024 bytes per submission). */
const MAX_MESSAGE_BYTES = 1024;

const TOPIC_ID_REGEX = /^\d+\.\d+\.\d+$/;

function validateTopicId(topicId: string): boolean {
  return Boolean(topicId && TOPIC_ID_REGEX.test(topicId));
}

export async function POST(req: Request) {
  if (!hasOperatorKey()) {
    return NextResponse.json(
      { error: "Operator key not configured (HEDERA_OPERATOR_ID, HEDERA_OPERATOR_PRIVATE_KEY)" },
      { status: 503 },
    );
  }

  let body: { topicId?: string; text?: string; author?: string };
  try {
    body = (await req.json()) as { topicId?: string; text?: string; author?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { topicId, text, author } = body;
  if (!topicId || typeof text !== "string") {
    return NextResponse.json({ error: "topicId (string) and text (string) are required" }, { status: 400 });
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return NextResponse.json({ error: "text cannot be empty" }, { status: 400 });
  }

  if (!validateTopicId(topicId)) {
    return NextResponse.json({ error: "Invalid topicId: expected format 0.0.xxxxx" }, { status: 400 });
  }

  const payload = JSON.stringify({
    text: trimmed,
    author: author ?? null,
    timestamp: Date.now(),
  });
  const payloadBytes = new TextEncoder().encode(payload).length;
  if (payloadBytes > MAX_MESSAGE_BYTES) {
    return NextResponse.json(
      { error: `Message too long (${payloadBytes} bytes, max ${MAX_MESSAGE_BYTES})` },
      { status: 400 },
    );
  }

  try {
    const client = getHederaClient();
    const transaction = new TopicMessageSubmitTransaction().setTopicId(TopicId.fromString(topicId)).setMessage(payload);

    const response = await transaction.execute(client);
    const receipt = await response.getReceipt(client);

    const sequenceNumber = receipt.topicSequenceNumber?.toString();
    const status = receipt.status.toString();

    return NextResponse.json({
      status,
      topicId,
      sequenceNumber: sequenceNumber ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Submit failed";
    console.error("[api/hedera/submit-message]", e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
