import { NextResponse } from "next/server";
import { TokenCreateTransaction, TokenSupplyType, TokenType } from "@hiero-ledger/sdk";
import { getHederaClient, hasOperatorKey } from "~~/services/hederaClient";

const TOKEN_ID_LIKE_REGEX = /^\d+\.\d+\.\d+$/;
const TOKEN_SYMBOL_REGEX = /^[A-Z0-9]{1,10}$/;

export async function POST(req: Request) {
  if (!hasOperatorKey()) {
    return NextResponse.json({ error: "Operator key not configured" }, { status: 503 });
  }

  let body: { name: string; symbol: string; initialSupply?: string };
  try {
    body = (await req.json()) as { name: string; symbol: string; initialSupply?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, symbol, initialSupply = "0" } = body;
  const normalizedName = name?.trim();
  const normalizedSymbol = symbol?.trim().toUpperCase();
  if (!normalizedName || !normalizedSymbol) {
    return NextResponse.json({ error: "name and symbol are required" }, { status: 400 });
  }
  if (normalizedName.length > 100) {
    return NextResponse.json({ error: "name must be <= 100 characters" }, { status: 400 });
  }
  if (!TOKEN_SYMBOL_REGEX.test(normalizedSymbol)) {
    return NextResponse.json({ error: "symbol must be 1-10 chars, uppercase letters/numbers only" }, { status: 400 });
  }
  const parsedInitialSupply = Number(initialSupply);
  if (!Number.isFinite(parsedInitialSupply) || !Number.isInteger(parsedInitialSupply) || parsedInitialSupply < 0) {
    return NextResponse.json({ error: "initialSupply must be a non-negative integer" }, { status: 400 });
  }

  try {
    const client = getHederaClient();
    if (!client.operatorAccountId || !TOKEN_ID_LIKE_REGEX.test(client.operatorAccountId.toString())) {
      return NextResponse.json({ error: "Invalid operator account ID" }, { status: 503 });
    }
    const response = await new TokenCreateTransaction()
      .setTokenName(normalizedName)
      .setTokenSymbol(normalizedSymbol)
      .setTokenType(TokenType.FungibleCommon)
      .setDecimals(0)
      .setInitialSupply(parsedInitialSupply)
      .setSupplyType(TokenSupplyType.Infinite)
      .setTreasuryAccountId(client.operatorAccountId!)
      .execute(client);
    const receipt = await response.getReceipt(client);
    const tokenId = receipt.tokenId?.toString();
    if (!tokenId) {
      return NextResponse.json({ error: "No tokenId in receipt" }, { status: 502 });
    }
    return NextResponse.json({
      status: receipt.status.toString(),
      tokenId,
      symbol: normalizedSymbol,
      name: normalizedName,
      initialSupply: parsedInitialSupply,
      treasuryAccountId: client.operatorAccountId.toString(),
      transactionId: response.transactionId.toString(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Create token failed";
    console.error("[api/hedera/create-token]", e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
