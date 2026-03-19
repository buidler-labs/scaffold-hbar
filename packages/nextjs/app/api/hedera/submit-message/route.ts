import { NextResponse } from "next/server";
import { TopicId, TopicMessageSubmitTransaction } from "@hiero-ledger/sdk";
import { getHederaClient, hasOperatorKey } from "~~/services/hederaClient";

export async function POST(req: Request) {
  if (!hasOperatorKey()) {
    return NextResponse.json({ error: "Operator key not configured" }, { status: 503 });
  }

  let body: { topicId: string; text: string; author?: string };
  try {
    body = (await req.json()) as { topicId: string; text: string; author?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { topicId, text, author } = body;
  if (!topicId || typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "topicId and text required" }, { status: 400 });
  }

  try {
    const client = getHederaClient();
    const payload = JSON.stringify({
      text: text.trim(),
      author: author ?? null,
      timestamp: Date.now(),
    });
    const tx = await new TopicMessageSubmitTransaction()
      .setTopicId(TopicId.fromString(topicId))
      .setMessage(payload)
      .execute(client);
    const receipt = await tx.getReceipt(client);
    return NextResponse.json({
      status: receipt.status.toString(),
      topicId,
      sequenceNumber: receipt.topicSequenceNumber?.toString(),
    });
  } catch (e) {
    console.error("[api/hedera/submit-message]", e);
    return NextResponse.json({ error: "Submit failed" }, { status: 502 });
  }
}
