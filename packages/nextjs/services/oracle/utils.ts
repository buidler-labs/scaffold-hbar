import { ORACLE_PROVIDERS } from "./constants";
import type { OraclePair, OracleProviderId } from "./types";
import { encodeAbiParameters, formatUnits, keccak256 } from "viem";

export const getOracleProvider = (providerId: OracleProviderId) => {
  return ORACLE_PROVIDERS.find(provider => provider.id === providerId) ?? ORACLE_PROVIDERS[0];
};

export const getOracleConsumerDeployCommand = (adapterName: string) => {
  return `ORACLE_ADAPTER_NAME=${adapterName} yarn foundry:deploy:consumer:testnet`;
};

export const getOraclePairKey = ({ baseSymbol, quoteSymbol }: Pick<OraclePair, "baseSymbol" | "quoteSymbol">) => {
  return keccak256(
    encodeAbiParameters(
      [
        { name: "baseSymbol", type: "string" },
        { name: "quoteSymbol", type: "string" },
      ],
      [baseSymbol, quoteSymbol],
    ),
  );
};

export const getOracleBaseUnitAmount = ({ baseDecimals }: Pick<OraclePair, "baseDecimals">) => {
  return 10n ** BigInt(baseDecimals);
};

export const formatOracleAmount = (amount: bigint, decimals: number, displayDecimals: number) => {
  const value = Number(formatUnits(amount, decimals));

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: displayDecimals,
  }).format(value);
};

export const formatOracleLatestUpdate = (latestUpdate?: bigint) => {
  if (latestUpdate === undefined || latestUpdate === 0n) return undefined;

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(Number(latestUpdate) * 1000));
};
