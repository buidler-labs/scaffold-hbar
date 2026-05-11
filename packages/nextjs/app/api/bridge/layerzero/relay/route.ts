import { NextResponse } from "next/server";
import type { Hex } from "viem";
import { z } from "zod";
import {
  LayerZeroRelayConfigError,
  LayerZeroRelayInputError,
  relayLayerZeroPacket,
} from "~~/services/bridge/server/layerzeroRelay";

const relayRequestSchema = z.object({
  direction: z.enum(["hedera-to-sepolia", "sepolia-to-hedera"]),
  txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
});

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = relayRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid LayerZero relay request." }, { status: 400 });
  }

  try {
    const result = await relayLayerZeroPacket({
      direction: parsed.data.direction,
      txHash: parsed.data.txHash as Hex,
    });
    return NextResponse.json({
      status: "delivered",
      executeTxHash: result.executeTxHash,
      guid: result.guid,
      verifyTxHash: result.verifyTxHash,
    });
  } catch (error) {
    if (error instanceof LayerZeroRelayConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    if (error instanceof LayerZeroRelayInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("[api/bridge/layerzero/relay]", error);
    return NextResponse.json({ error: "LayerZero relay failed." }, { status: 502 });
  }
}
