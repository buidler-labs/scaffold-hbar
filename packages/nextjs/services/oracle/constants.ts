import { getPackageRunCommand } from "./commands";
import type { OraclePair, OracleProvider } from "./types";

export const USD_ORACLE_PAIRS = [
  {
    id: "hbar-usd",
    baseSymbol: "HBAR",
    quoteSymbol: "USD",
    baseDecimals: 8,
    quoteDecimals: 6,
    displayDecimals: 5,
  },
  {
    id: "btc-usd",
    baseSymbol: "BTC",
    quoteSymbol: "USD",
    baseDecimals: 8,
    quoteDecimals: 6,
    displayDecimals: 2,
  },
  {
    id: "eth-usd",
    baseSymbol: "ETH",
    quoteSymbol: "USD",
    baseDecimals: 18,
    quoteDecimals: 6,
    displayDecimals: 2,
  },
] as const satisfies readonly OraclePair[];

export const USDT_ORACLE_PAIRS = [
  {
    id: "hbar-usdt",
    baseSymbol: "HBAR",
    quoteSymbol: "USDT",
    baseDecimals: 8,
    quoteDecimals: 6,
    displayDecimals: 5,
  },
  {
    id: "btc-usdt",
    baseSymbol: "BTC",
    quoteSymbol: "USDT",
    baseDecimals: 8,
    quoteDecimals: 6,
    displayDecimals: 2,
  },
  {
    id: "eth-usdt",
    baseSymbol: "ETH",
    quoteSymbol: "USDT",
    baseDecimals: 18,
    quoteDecimals: 6,
    displayDecimals: 2,
  },
] as const satisfies readonly OraclePair[];

export const ORACLE_PROVIDERS = [
  {
    id: "chainlink",
    label: "Chainlink",
    contractName: "ChainlinkPriceOracleAdapter",
    deployCommand: getPackageRunCommand("foundry:deploy:chainlink:testnet"),
    pairs: USD_ORACLE_PAIRS,
  },
  {
    id: "supra",
    label: "Supra",
    contractName: "SupraPriceOracleAdapter",
    deployCommand: getPackageRunCommand("foundry:deploy:supra:testnet"),
    pairs: USDT_ORACLE_PAIRS,
  },
  {
    id: "pyth",
    label: "Pyth",
    contractName: "PythPriceOracleAdapter",
    deployCommand: getPackageRunCommand("foundry:deploy:pyth:testnet"),
    pairs: USD_ORACLE_PAIRS,
  },
] as const satisfies readonly OracleProvider[];

export const ORACLE_CONSUMER_CONTRACT_NAME = "OracleConsumer";
