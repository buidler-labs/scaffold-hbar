import { NextResponse } from "next/server";
import { getMirrorBaseUrl } from "~~/services/mirrorNode";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tokenId = searchParams.get("tokenId");
  const accountId = searchParams.get("accountId");
  const network = searchParams.get("network") ?? "testnet";

  if (!tokenId || !accountId) {
    return NextResponse.json({ error: "tokenId and accountId required" }, { status: 400 });
  }

  try {
    const base = getMirrorBaseUrl(network);
    const url = `${base}/api/v1/accounts/${accountId}/tokens?token.id=${tokenId}`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return NextResponse.json({ balance: 0 });
    const data = (await res.json()) as { tokens?: { balance?: number }[] };
    const balance = data.tokens?.[0]?.balance ?? 0;
    return NextResponse.json({ accountId, tokenId, balance });
  } catch (e) {
    console.error("[api/hedera/token-balance]", e);
    return NextResponse.json({ error: "Failed to fetch balance" }, { status: 502 });
  }
}
