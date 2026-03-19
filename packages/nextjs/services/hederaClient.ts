/**
 * Server-side Hedera SDK client (operator key).
 * Used by API routes to sign and submit native Hedera transactions.
 */
import { Client } from "@hiero-ledger/sdk";

const operatorId = process.env.HEDERA_OPERATOR_ID ?? "";
const operatorKey = process.env.HEDERA_OPERATOR_PRIVATE_KEY ?? "";
const network = (process.env.HEDERA_NETWORK ?? "testnet").toLowerCase();

export function getHederaClient(): Client {
  const client = network === "mainnet" ? Client.forMainnet() : Client.forTestnet();
  if (operatorId && operatorKey) {
    client.setOperator(operatorId, operatorKey);
  }
  return client;
}

export function hasOperatorKey(): boolean {
  return Boolean(operatorId && operatorKey);
}
