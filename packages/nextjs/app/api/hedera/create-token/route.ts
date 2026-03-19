import { NextResponse } from "next/server";
import { TokenCreateTransaction, TokenSupplyType, TokenType } from "@hiero-ledger/sdk";
import { getHederaClient, hasOperatorKey } from "~~/services/hederaClient";

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
  if (!name?.trim() || !symbol?.trim()) {
    return NextResponse.json({ error: "name and symbol required" }, { status: 400 });
  }

  try {
    const client = getHederaClient();
    const response = await new TokenCreateTransaction()
      .setTokenName(name.trim())
      .setTokenSymbol(symbol.trim())
      .setTokenType(TokenType.FungibleCommon)
      .setDecimals(0)
      .setInitialSupply(Number(initialSupply) || 0)
      .setSupplyType(TokenSupplyType.Infinite)
      .setTreasuryAccountId(client.operatorAccountId!)
      .execute(client);
    const receipt = await response.getReceipt(client);
    const tokenId = receipt.tokenId?.toString();
    if (!tokenId) {
      return NextResponse.json({ error: "No tokenId in receipt" }, { status: 502 });
    }
    return NextResponse.json({ tokenId });
  } catch (e) {
    console.error("[api/hedera/create-token]", e);
    return NextResponse.json({ error: "Create token failed" }, { status: 502 });
  }
}
