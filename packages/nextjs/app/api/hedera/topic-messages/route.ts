import { NextResponse } from "next/server";
import { fetchTopicMessages } from "~~/services/mirrorNode";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const topicId = searchParams.get("topicId");
  const network = (searchParams.get("network") ?? "testnet").toLowerCase();
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";
  const sequenceNumber = searchParams.get("sequenceNumber");
  const timestamp = searchParams.get("timestamp") ?? undefined;

  if (!topicId) {
    return NextResponse.json({ error: "Missing topicId" }, { status: 400 });
  }

  try {
    const result = await fetchTopicMessages(topicId, {
      network,
      limit,
      order,
      sequenceNumber: sequenceNumber != null ? Number(sequenceNumber) : undefined,
      timestamp,
    });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch topic messages";
    const status = message.startsWith("Invalid topic ID") ? 400 : 502;
    console.error("[api/hedera/topic-messages]", e);
    return NextResponse.json({ error: message }, { status });
  }
}
