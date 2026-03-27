import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // Read and discard body to keep request shape compatibility.
    await req.json();
  } catch {
    // No-op: route is deprecated regardless of body validity.
  }

  return NextResponse.json(
    {
      error: "Deprecated endpoint",
      message:
        "POST /api/hedera/create-topic no longer signs transactions server-side. Create topics on the client with Hedera WalletConnect signer.",
    },
    { status: 410 },
  );
}
