import { NextResponse } from "next/server";
import { TokenId, TransferTransaction } from "@hiero-ledger/sdk";
import { getHederaClient, hasOperatorKey } from "~~/services/hederaClient";

export async function POST(req: Request) {
  if (!hasOperatorKey()) {
    return NextResponse.json({ error: "Operator key not configured" }, { status: 503 });
  }

  let body: { tokenId: string; recipientAccountId: string; amount: string };
  try {
    body = (await req.json()) as {
      tokenId: string;
      recipientAccountId: string;
      amount: string;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { tokenId, recipientAccountId, amount } = body;
  if (!tokenId || !recipientAccountId || amount == null) {
    return NextResponse.json({ error: "tokenId, recipientAccountId, and amount required" }, { status: 400 });
  }

  const amountNum = Number(amount);
  if (!Number.isInteger(amountNum) || amountNum < 1) {
    return NextResponse.json({ error: "amount must be a positive integer" }, { status: 400 });
  }

  try {
    const client = getHederaClient();
    const tx = await new TransferTransaction()
      .addTokenTransfer(TokenId.fromString(tokenId), client.operatorAccountId!, -amountNum)
      .addTokenTransfer(TokenId.fromString(tokenId), recipientAccountId, amountNum)
      .execute(client);
    const receipt = await tx.getReceipt(client);
    return NextResponse.json({
      status: receipt.status.toString(),
      tokenId,
      recipientAccountId,
      amount: amountNum,
    });
  } catch (e) {
    console.error("[api/hedera/airdrop]", e);
    return NextResponse.json({ error: "Airdrop failed" }, { status: 502 });
  }
}
