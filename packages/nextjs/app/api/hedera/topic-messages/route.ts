import { NextResponse } from "next/server";
import { fetchTopicMessages } from "~~/services/mirrorNode";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const topicId = searchParams.get("topicId");
  const network = searchParams.get("network") ?? "testnet";
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);

  if (!topicId) {
    return NextResponse.json({ error: "Missing topicId" }, { status: 400 });
  }

  try {
    const { messages } = await fetchTopicMessages(topicId, network, limit);
    return NextResponse.json({ messages });
  } catch (e) {
    console.error("[api/hedera/topic-messages]", e);
    return NextResponse.json({ error: "Failed to fetch topic messages" }, { status: 502 });
  }
}
