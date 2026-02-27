"use client";

import { useEffect } from "react";
import { PaginationButton, SearchBar, TransactionsTable } from "./_components";
import type { NextPage } from "next";
import { useFetchBlocks } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { notification } from "~~/utils/scaffold-eth";

const BlockExplorer: NextPage = () => {
  const { blocks, transactionReceipts, currentPage, totalBlocks, setCurrentPage, error } = useFetchBlocks();
  const { targetNetwork } = useTargetNetwork();

  useEffect(() => {
    if (error) {
      notification.error(
        <>
          <p className="font-bold mt-0 mb-1">Failed to connect to {targetNetwork.name}</p>
          <p className="m-0">
            Check that your RPC endpoint is available and the target network is configured correctly in{" "}
            <code className="italic bg-base-300 text-base font-bold">scaffold.config.ts</code>
          </p>
        </>,
      );
    }
  }, [error, targetNetwork.name]);

  return (
    <div className="container mx-auto my-10">
      <SearchBar />
      <TransactionsTable blocks={blocks} transactionReceipts={transactionReceipts} />
      <PaginationButton currentPage={currentPage} totalItems={Number(totalBlocks)} setCurrentPage={setCurrentPage} />
    </div>
  );
};

export default BlockExplorer;
