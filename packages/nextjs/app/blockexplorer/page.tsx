"use client";

import { useEffect, useMemo, useState } from "react";
import { PaginationButton, SearchBar, TransactionsTable } from "./_components";
import type { NextPage } from "next";
import { Block, Transaction, TransactionReceipt } from "viem";
import { hardhat } from "viem/chains";
import { useFetchBlocks } from "~~/hooks/scaffold-hbar";
import { useTargetNetwork } from "~~/hooks/scaffold-hbar/useTargetNetwork";
import { notification } from "~~/utils/scaffold-hbar";
import { useAllContracts } from "~~/utils/scaffold-hbar/contractsData";

const BlockExplorer: NextPage = () => {
  const { targetNetwork } = useTargetNetwork();
  const isLocalNetwork = targetNetwork.id === hardhat.id;
  const { blocks, transactionReceipts, currentPage, totalBlocks, setCurrentPage, error } =
    useFetchBlocks(isLocalNetwork);
  const allContracts = useAllContracts();
  const [hasError, setHasError] = useState(false);

  const contractAddresses = useMemo(
    () => new Set(Object.values(allContracts).map(c => c.address.toLowerCase())),
    [allContracts],
  );

  const filteredBlocks = useMemo(() => {
    if (contractAddresses.size === 0) return blocks;

    return blocks
      .map(block => ({
        ...block,
        transactions: (block.transactions as Transaction[]).filter(tx => {
          if (typeof tx === "string") return false;
          const toMatch = tx.to && contractAddresses.has(tx.to.toLowerCase());
          const receipt: TransactionReceipt | undefined = transactionReceipts[tx.hash];
          const deployMatch = receipt?.contractAddress && contractAddresses.has(receipt.contractAddress.toLowerCase());
          return toMatch || deployMatch;
        }),
      }))
      .filter(block => block.transactions.length > 0) as Block[];
  }, [blocks, transactionReceipts, contractAddresses]);

  useEffect(() => {
    if (targetNetwork.id === hardhat.id && error) {
      setHasError(true);
    }
  }, [targetNetwork.id, error]);

  useEffect(() => {
    if (hasError) {
      notification.error(
        <>
          <p className="font-bold mt-0 mb-1">Cannot connect to local provider</p>
          <p className="m-0">
            - Did you forget to run <code className="italic bg-base-300 text-base font-bold">yarn hardhat:chain</code> ?
          </p>
          <p className="mt-1 break-normal">
            - Or you can change <code className="italic bg-base-300 text-base font-bold">targetNetwork</code> in{" "}
            <code className="italic bg-base-300 text-base font-bold">scaffold.config.ts</code>
          </p>
        </>,
      );
    }
  }, [hasError]);

  const hasContracts = contractAddresses.size > 0;
  const hasTransactions = filteredBlocks.some(block => block.transactions.length > 0);

  if (!isLocalNetwork) {
    return (
      <div className="container mx-auto my-10">
        <div className="flex justify-center p-8">
          <div className="max-w-xl text-center text-base-content/80">
            <p className="font-bold mb-2">
              <code className="italic bg-base-300 text-base font-bold">targetNetwork</code> is not localhost
            </p>
            <p className="mb-2">
              You are on <code className="italic bg-base-300 text-base font-bold">{targetNetwork.name}</code>. This
              block explorer is only for <code className="italic bg-base-300 text-base font-bold">localhost</code>.
            </p>
            {targetNetwork.blockExplorers?.default && (
              <p>
                You can use{" "}
                <a
                  className="text-accent underline"
                  href={targetNetwork.blockExplorers.default.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {targetNetwork.blockExplorers.default.name}
                </a>{" "}
                instead.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto my-10">
      <SearchBar />
      {hasContracts && !hasTransactions && blocks.length > 0 && (
        <div className="flex justify-center p-8">
          <p className="text-lg text-base-content/70">
            No transactions involving your contracts found in the latest blocks.
          </p>
        </div>
      )}
      {!hasContracts && (
        <div className="flex justify-center p-8">
          <p className="text-lg text-base-content/70">
            No contracts registered. Deploy a contract or add entries to{" "}
            <code className="italic bg-base-300 text-base font-bold">externalContracts.ts</code>.
          </p>
        </div>
      )}
      <TransactionsTable blocks={filteredBlocks} transactionReceipts={transactionReceipts} />
      <PaginationButton currentPage={currentPage} totalItems={Number(totalBlocks)} setCurrentPage={setCurrentPage} />
    </div>
  );
};

export default BlockExplorer;
