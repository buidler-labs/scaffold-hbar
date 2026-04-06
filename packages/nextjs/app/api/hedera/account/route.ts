import { NextResponse } from "next/server";
import type { MirrorAccountResponse } from "~~/types/hederaFetchJson";

const MIRROR_BASE: Record<string, string> = {
  testnet: process.env.HEDERA_MIRROR_TESTNET_URL ?? "https://testnet.mirrornode.hedera.com",
  mainnet: process.env.HEDERA_MIRROR_MAINNET_URL ?? "https://mainnet.mirrornode.hedera.com",
  local: process.env.HEDERA_MIRROR_LOCAL_URL ?? "",
};

const EVM_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const evm = searchParams.get("evm");
  const network = (searchParams.get("network") ?? "testnet").toLowerCase();

  if (!evm || !EVM_ADDRESS_RE.test(evm)) {
    return NextResponse.json({ error: "Missing or invalid EVM address" }, { status: 400 });
  }

  const base = MIRROR_BASE[network] ?? MIRROR_BASE.testnet;
  if (network === "local" && !base) {
    return NextResponse.json({ accountId: null });
  }
  const url = `${base}/api/v1/accounts/${evm}`;

  try {
    const res = await fetch(url, { next: { revalidate: 60 } });

    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json({ accountId: null });
      }
      return NextResponse.json({ error: "Mirror node request failed", status: res.status }, { status: 502 });
    }

    const data = (await res.json()) as MirrorAccountResponse;
    const accountId = typeof data.account === "string" ? data.account : null;
    return NextResponse.json({ accountId });
  } catch (e) {
    console.error("[api/hedera/account]", e);
    return NextResponse.json({ error: "Resolution failed" }, { status: 502 });
  }
}
