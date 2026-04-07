import { NextRequest, NextResponse } from "next/server";
import { getMirrorBaseUrl } from "~~/services/mirrorNode";
import {
  HederaMirrorNetwork,
  TopicIdResolutionStatus,
  resolveTopicIdFromMirrorTransaction,
} from "~~/utils/scaffold-hbar/topicIdByTransaction";

function getDefaultNetwork(): HederaMirrorNetwork {
  const raw = process.env.HEDERA_NETWORK?.trim().toLowerCase();
  if (raw === "mainnet") return raw;
  return "testnet";
}

function normalizeNetwork(value: string | null | undefined): HederaMirrorNetwork {
  const raw = value?.trim().toLowerCase();
  if (raw === "mainnet" || raw === "testnet") return raw;
  return getDefaultNetwork();
}

export async function GET(req: NextRequest) {
  const txId = req.nextUrl.searchParams.get("transactionId")?.trim();
  const network = normalizeNetwork(req.nextUrl.searchParams.get("network"));

  if (!txId) {
    return NextResponse.json({ error: "Missing transactionId" }, { status: 400 });
  }

  try {
    const base = getMirrorBaseUrl(network);
    const status: TopicIdResolutionStatus = await resolveTopicIdFromMirrorTransaction({
      mirrorBaseUrl: base,
      transactionId: txId,
      fetchFn: fetch,
    });
    return NextResponse.json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
