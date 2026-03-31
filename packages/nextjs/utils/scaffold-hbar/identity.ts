const EVM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const HEDERA_ACCOUNT_ID_REGEX = /^\d+\.\d+\.\d+$/;

export function isEvmAddress(value: string | null | undefined): value is `0x${string}` {
  return Boolean(value && EVM_ADDRESS_REGEX.test(value));
}

export function isHederaAccountId(value: string | null | undefined): value is string {
  return Boolean(value && HEDERA_ACCOUNT_ID_REGEX.test(value));
}

export function normalizeIdentity(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function truncateIdentity(value: string, evmPrefix = 6, tail = 4): string {
  if (!value || value.length <= evmPrefix + tail) return value;
  if (isEvmAddress(value)) return `${value.slice(0, evmPrefix + 2)}…${value.slice(-tail)}`;
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}
