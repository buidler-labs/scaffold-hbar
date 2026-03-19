import { NextResponse } from "next/server";
import { hasOperatorKey } from "~~/services/hederaClient";

/**
 * Returns whether the server has operator credentials (no secrets exposed).
 */
export async function GET() {
  return NextResponse.json({
    operatorConfigured: hasOperatorKey(),
  });
}
