export const DECIMAL_AMOUNT_INPUT_PATTERN = /^\d*(?:\.\d*)?$/;
export const QUOTABLE_DECIMAL_AMOUNT_PATTERN = /^(?:\d+|\d+\.\d+|\.\d+)$/;

export const isDecimalAmountInput = (value: string) => DECIMAL_AMOUNT_INPUT_PATTERN.test(value);

export const normalizeBridgeAmount = (value: string) => {
  const trimmedValue = value.trim();
  return trimmedValue.startsWith(".") ? `0${trimmedValue}` : trimmedValue;
};

export const isQuotableDecimalAmount = (value: string) => QUOTABLE_DECIMAL_AMOUNT_PATTERN.test(value);
