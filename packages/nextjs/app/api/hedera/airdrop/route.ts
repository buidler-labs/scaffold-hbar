import { NextResponse } from "next/server";
import { AccountId, TokenAirdropTransaction, TokenId, TransferTransaction } from "@hiero-ledger/sdk";
import { getHederaClient, hasOperatorKey } from "~~/services/hederaClient";

const ID_REGEX = /^\d+\.\d+\.\d+$/;

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
  if (!ID_REGEX.test(tokenId)) {
    return NextResponse.json({ error: "tokenId must be in 0.0.x format" }, { status: 400 });
  }
  if (!ID_REGEX.test(recipientAccountId)) {
    return NextResponse.json({ error: "recipientAccountId must be in 0.0.x format" }, { status: 400 });
  }

  const amountNum = Number(amount);
  if (!Number.isInteger(amountNum) || amountNum < 1) {
    return NextResponse.json({ error: "amount must be a positive integer" }, { status: 400 });
  }

  try {
    const client = getHederaClient();
    if (!client.operatorAccountId) {
      return NextResponse.json({ error: "Operator account is not configured" }, { status: 503 });
    }
    const parsedTokenId = TokenId.fromString(tokenId);
    const parsedRecipientAccountId = AccountId.fromString(recipientAccountId);

    let response;
    try {
      response = await new TokenAirdropTransaction()
        .addTokenTransfer(parsedTokenId, client.operatorAccountId, -amountNum)
        .addTokenTransfer(parsedTokenId, parsedRecipientAccountId, amountNum)
        .execute(client);
    } catch {
      // Fallback for SDK versions/networks where native airdrop is unavailable.
      response = await new TransferTransaction()
        .addTokenTransfer(parsedTokenId, client.operatorAccountId, -amountNum)
        .addTokenTransfer(parsedTokenId, parsedRecipientAccountId, amountNum)
        .execute(client);
    }

    const receipt = await response.getReceipt(client);
    return NextResponse.json({
      status: receipt.status.toString(),
      tokenId,
      recipientAccountId,
      amount: amountNum,
      transactionId: response.transactionId.toString(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Airdrop failed";
    console.error("[api/hedera/airdrop]", e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
