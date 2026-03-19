import { NextResponse } from "next/server";
import { TopicCreateTransaction } from "@hiero-ledger/sdk";
import { getHederaClient, hasOperatorKey } from "~~/services/hederaClient";

export async function POST(req: Request) {
  if (!hasOperatorKey()) {
    return NextResponse.json({ error: "Operator key not configured" }, { status: 503 });
  }

  let body: { memo?: string };
  try {
    body = (await req.json()) as { memo?: string };
  } catch {
    body = {};
  }

  try {
    const client = getHederaClient();
    const tx = new TopicCreateTransaction();
    if (body.memo) tx.setTopicMemo(body.memo);
    const response = await tx.execute(client);
    const receipt = await response.getReceipt(client);
    const topicId = receipt.topicId?.toString();
    if (!topicId) {
      return NextResponse.json({ error: "No topicId in receipt" }, { status: 502 });
    }
    return NextResponse.json({ topicId });
  } catch (e) {
    console.error("[api/hedera/create-topic]", e);
    return NextResponse.json({ error: "Create topic failed" }, { status: 502 });
  }
}
