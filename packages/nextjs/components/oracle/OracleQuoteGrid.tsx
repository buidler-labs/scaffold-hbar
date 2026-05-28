"use client";

import type { Abi, Address as ViemAddress } from "viem";
import { useReadContract } from "wagmi";
import { ArrowPathIcon, CheckCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useTargetNetwork } from "~~/hooks/scaffold-hbar";
import {
  ORACLE_CONSUMER_CONTRACT_NAME,
  type OraclePair,
  type OracleProvider,
  formatOracleAmount,
  formatOracleLatestUpdate,
  getOracleBaseUnitAmount,
  getOraclePairKey,
} from "~~/services/oracle";
import { useAllContracts } from "~~/utils/scaffold-hbar/contractsData";

type OracleQuoteGridProps = {
  consumerAddress?: ViemAddress;
  isActiveProvider: boolean;
  isCheckingActiveOracle: boolean;
  provider: OracleProvider;
};

type OracleQuoteCardProps = OracleQuoteGridProps & {
  pair: OraclePair;
};

type AbiFunction = {
  name?: string;
  type: string;
};

const hasAbiFunction = (abi: Abi | undefined, functionName: string) => {
  return (abi as readonly AbiFunction[] | undefined)?.some(
    entry => entry.type === "function" && entry.name === functionName,
  );
};

const getQuoteAmount = (quoteResult: unknown) => {
  if (typeof quoteResult === "bigint") return quoteResult;
  if (Array.isArray(quoteResult)) return quoteResult[0] as bigint | undefined;
  if (quoteResult && typeof quoteResult === "object" && "quoteAmount" in quoteResult) {
    return quoteResult.quoteAmount as bigint | undefined;
  }

  return undefined;
};

const getQuoteLatestUpdate = (quoteResult: unknown) => {
  if (Array.isArray(quoteResult)) return quoteResult[1] as bigint | undefined;
  if (quoteResult && typeof quoteResult === "object" && "latestUpdate" in quoteResult) {
    return quoteResult.latestUpdate as bigint | undefined;
  }

  return undefined;
};

const getPriceDataLatestUpdate = (priceData: unknown) => {
  if (Array.isArray(priceData)) return priceData[3] as bigint | undefined;
  if (priceData && typeof priceData === "object" && "updatedAt" in priceData) {
    return priceData.updatedAt as bigint | undefined;
  }

  return undefined;
};

const OracleQuoteCard = ({
  consumerAddress,
  isActiveProvider,
  isCheckingActiveOracle,
  pair,
  provider,
}: OracleQuoteCardProps) => {
  const { targetNetwork } = useTargetNetwork();
  const contractsData = useAllContracts();
  const consumerContract = contractsData[ORACLE_CONSUMER_CONTRACT_NAME];
  const consumerAbi = consumerContract?.abi as Abi | undefined;
  const providerContract = contractsData[provider.contractName];
  const providerAbi = providerContract?.abi as Abi | undefined;
  const pairKey = getOraclePairKey(pair);
  const baseUnitAmount = getOracleBaseUnitAmount(pair);
  const canRead = Boolean(consumerAddress && isActiveProvider && !isCheckingActiveOracle);
  const hasQuoteWithLatestUpdate = hasAbiFunction(consumerAbi, "baseToQuoteWithLatestUpdate");
  const {
    data: quoteResult,
    error: quoteAmountError,
    isFetching,
    isLoading,
  } = useReadContract({
    address: consumerAddress,
    abi: consumerAbi,
    chainId: targetNetwork.id,
    functionName: hasQuoteWithLatestUpdate ? "baseToQuoteWithLatestUpdate" : "baseToQuote",
    args: [pairKey, baseUnitAmount, pair.baseDecimals, pair.quoteDecimals],
    query: {
      enabled: canRead && Boolean(consumerAbi),
    },
  } as any);
  const { data: providerPriceData } = useReadContract({
    address: providerContract?.address,
    abi: providerAbi,
    chainId: targetNetwork.id,
    functionName: "latestPrice",
    args: [pairKey],
    query: {
      enabled: canRead && !hasQuoteWithLatestUpdate && Boolean(providerContract?.address && providerAbi),
    },
  } as any);
  const isReading = isLoading || isFetching;
  const quoteAmount = getQuoteAmount(quoteResult);
  const latestUpdate = getQuoteLatestUpdate(quoteResult) ?? getPriceDataLatestUpdate(providerPriceData);
  const formattedQuoteAmount =
    quoteAmount === undefined ? undefined : formatOracleAmount(quoteAmount, pair.quoteDecimals, pair.displayDecimals);
  const formattedLatestUpdate = formatOracleLatestUpdate(latestUpdate);
  const displayedQuoteAmount = canRead ? formattedQuoteAmount : undefined;
  const displayedLatestUpdate = canRead ? formattedLatestUpdate : undefined;

  const status = !consumerAddress
    ? {
        icon: <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-warning" />,
        text: "Deploy OracleConsumer before reading quotes.",
      }
    : isCheckingActiveOracle
      ? {
          icon: <ArrowPathIcon className="h-5 w-5 shrink-0 animate-spin text-info" />,
          text: "Checking active oracle...",
        }
      : !isActiveProvider
        ? {
            icon: <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-warning" />,
            text: `Set ${provider.label} as active oracle to read prices.`,
          }
        : quoteAmountError
          ? {
              icon: <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-error" />,
              text: quoteAmountError.message,
            }
          : formattedQuoteAmount
            ? {
                icon: <CheckCircleIcon className="h-5 w-5 shrink-0 text-success" />,
                text: "Live read from OracleConsumer.",
              }
            : {
                icon: <ArrowPathIcon className={`h-5 w-5 shrink-0 text-info ${isReading ? "animate-spin" : ""}`} />,
                text: isReading ? "Reading latest quote..." : "Ready to read live quote.",
              };

  return (
    <article className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-md">
      <div>
        <p className="m-0 text-xs font-semibold uppercase tracking-wide text-base-content/50">Live quote</p>
        <h3 className="m-0 mt-1 text-xl font-bold">
          {pair.baseSymbol}/{pair.quoteSymbol}
        </h3>
      </div>

      <div className="mt-5 rounded-lg border border-base-300 bg-base-200 p-4">
        <p className="m-0 text-sm text-base-content/70">1 {pair.baseSymbol}</p>
        <p className="m-0 mt-1 text-2xl font-bold">
          {displayedQuoteAmount ? (
            `${displayedQuoteAmount} ${pair.quoteSymbol}`
          ) : isReading && canRead ? (
            <>
              <span className="sr-only">Waiting for read</span>
              <span className="loading loading-dots loading-lg" aria-hidden="true" />
            </>
          ) : (
            <>
              <span className="sr-only">Quote unavailable</span>
              <span className="text-base-content/40" aria-hidden="true">
                --
              </span>
            </>
          )}
        </p>
        <div className="mt-4 min-h-11 border-t border-base-300 pt-3">
          <p className="m-0 text-xs font-semibold uppercase tracking-wide text-base-content/50">Latest update</p>
          <p className="m-0 mt-1 text-sm font-medium text-base-content/75">
            {displayedLatestUpdate ?? (isReading && canRead ? "Reading timestamp..." : "Unavailable")}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 text-sm leading-5 text-base-content/70">
        {status.icon}
        <span>{status.text}</span>
      </div>
    </article>
  );
};

export const OracleQuoteGrid = ({
  consumerAddress,
  isActiveProvider,
  isCheckingActiveOracle,
  provider,
}: OracleQuoteGridProps) => {
  return (
    <section>
      <div className="mb-4 flex flex-col justify-between gap-2 md:flex-row md:items-end">
        <div>
          <p className="m-0 text-xs font-semibold uppercase tracking-wide text-primary">Prices</p>
          <h2 className="m-0 mt-1 text-2xl font-bold">{provider.label} prices</h2>
        </div>
        <span className="badge badge-outline">{provider.pairs.length} price feeds</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {provider.pairs.map(pair => (
          <OracleQuoteCard
            key={pair.id}
            consumerAddress={consumerAddress}
            isActiveProvider={isActiveProvider}
            isCheckingActiveOracle={isCheckingActiveOracle}
            pair={pair}
            provider={provider}
          />
        ))}
      </div>
    </section>
  );
};
