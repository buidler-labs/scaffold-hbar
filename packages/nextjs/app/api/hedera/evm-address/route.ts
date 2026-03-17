import { NextResponse } from "next/server";

const MIRROR_BASE: Record<string, string> = {
  testnet: process.env.HEDERA_MIRROR_TESTNET_URL ?? "https://testnet.mirrornode.hedera.com",
  mainnet: process.env.HEDERA_MIRROR_MAINNET_URL ?? "https://mainnet.mirrornode.hedera.com",
};

const NATIVE_ACCOUNT_ID_REGEX = /^\d+\.\d+\.\d+$/;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId");
  const network = (searchParams.get("network") ?? "testnet").toLowerCase();

  if (!accountId || !NATIVE_ACCOUNT_ID_REGEX.test(accountId)) {
    return NextResponse.json({ error: "Missing or invalid Hedera account ID (expected 0.0.12345)" }, { status: 400 });
  }

  const base = MIRROR_BASE[network] ?? MIRROR_BASE.testnet;
  const url = `${base}/api/v1/accounts/${accountId}`;

  try {
    const res = await fetch(url, { next: { revalidate: 60 } });

    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json({ error: "Account not found on Hedera" }, { status: 404 });
      }
      return NextResponse.json({ error: "Mirror node request failed", status: res.status }, { status: 502 });
    }

    const data = (await res.json()) as { evm_address?: string; alias?: string };
    const evmAddress =
      typeof data.evm_address === "string"
        ? data.evm_address
        : typeof data.alias === "string" && data.alias.startsWith("0x")
          ? data.alias
          : null;

    return NextResponse.json({ evmAddress });
  } catch (e) {
    console.error("[api/hedera/evm-address]", e);
    return NextResponse.json({ error: "Resolution failed" }, { status: 502 });
  }
}
