export const TINYBAR_TO_WEI = BigInt(10 ** 10);
export const HBAR_DECIMALS = 8;
export const WEI_DECIMALS = 18;

export const tinybarsToWei = (tinybars: bigint): bigint => tinybars * TINYBAR_TO_WEI;

export const weiToTinybars = (wei: bigint): bigint => wei / TINYBAR_TO_WEI;

export const hbarToTinybars = (hbar: number | string): bigint => {
  const hbarValue = typeof hbar === "string" ? parseFloat(hbar) : hbar;
  return BigInt(Math.floor(hbarValue * 10 ** HBAR_DECIMALS));
};

export const tinybarsToHbar = (tinybars: bigint): number => {
  return Number(tinybars) / 10 ** HBAR_DECIMALS;
};

export const formatHbar = (tinybars: bigint, decimals: number = 2): string => {
  const hbar = tinybarsToHbar(tinybars);
  return hbar.toFixed(decimals);
};

export const parseHbarInput = (input: string): bigint | null => {
  const parsed = parseFloat(input);
  if (isNaN(parsed) || parsed < 0) return null;
  return hbarToTinybars(parsed);
};
