export type OracleProviderId = "chainlink" | "supra" | "pyth";

export type OraclePair = {
  id: string;
  baseSymbol: string;
  quoteSymbol: string;
  baseDecimals: number;
  quoteDecimals: number;
  displayDecimals: number;
};

export type OracleProvider = {
  id: OracleProviderId;
  label: string;
  contractName: string;
  deployCommand: string;
  pairs: readonly OraclePair[];
};
