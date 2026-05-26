"use client";

import type { Address as ViemAddress } from "viem";
import { ArrowPathIcon, CheckCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useScaffoldReadContract } from "~~/hooks/scaffold-hbar";
import {
  ORACLE_CONSUMER_CONTRACT_NAME,
  type OraclePair,
  type OracleProvider,
  formatOracleAmount,
  getOracleBaseUnitAmount,
  getOraclePairKey,
} from "~~/services/oracle";
import type { ContractName } from "~~/utils/scaffold-hbar/contract";

const ORACLE_CONSUMER_CONTRACT = ORACLE_CONSUMER_CONTRACT_NAME as ContractName;

type OracleQuoteGridProps = {
  consumerAddress?: ViemAddress;
  isActiveProvider: boolean;
  isCheckingActiveOracle: boolean;
  provider: OracleProvider;
};

type OracleQuoteCardProps = OracleQuoteGridProps & {
  pair: OraclePair;
};

const OracleQuoteCard = ({
  consumerAddress,
  isActiveProvider,
  isCheckingActiveOracle,
  pair,
  provider,
}: OracleQuoteCardProps) => {
  const pairKey = getOraclePairKey(pair);
  const baseUnitAmount = getOracleBaseUnitAmount(pair);
  const canRead = Boolean(consumerAddress && isActiveProvider && !isCheckingActiveOracle);
  const {
    data: quoteAmount,
    error: quoteAmountError,
    isFetching,
    isLoading,
  } = useScaffoldReadContract({
    contractName: ORACLE_CONSUMER_CONTRACT,
    functionName: "baseToQuote",
    args: [pairKey, baseUnitAmount, pair.baseDecimals, pair.quoteDecimals],
    watch: true,
    query: {
      enabled: canRead,
    },
  });
  const isReading = isLoading || isFetching;
  const formattedQuoteAmount =
    quoteAmount === undefined
      ? undefined
      : formatOracleAmount(quoteAmount as bigint, pair.quoteDecimals, pair.displayDecimals);

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
          {formattedQuoteAmount ? (
            `${formattedQuoteAmount} ${pair.quoteSymbol}`
          ) : (
            <>
              <span className="sr-only">Waiting for read</span>
              <span className="loading loading-dots loading-lg" aria-hidden="true" />
            </>
          )}
        </p>
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
