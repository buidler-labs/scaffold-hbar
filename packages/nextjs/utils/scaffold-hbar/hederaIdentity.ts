export function extractIdentity(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("hedera:") || trimmed.startsWith("eip155:")) {
    return trimmed.split(":").pop() ?? trimmed;
  }
  return trimmed;
}

export function hederaCaipId(accountIdLike: string): string {
  const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK ?? "testnet";
  const accountId = extractIdentity(accountIdLike);
  return `hedera:${network}:${accountId}`;
}
