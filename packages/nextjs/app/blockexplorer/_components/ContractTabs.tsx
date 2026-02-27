"use client";

import { useEffect, useState } from "react";
import { AddressCodeTab } from "./AddressCodeTab";
import { AddressLogsTab } from "./AddressLogsTab";
import { AddressStorageTab } from "./AddressStorageTab";
import { PaginationButton } from "./PaginationButton";
import { TransactionsTable } from "./TransactionsTable";
import { Address } from "viem";
import { usePublicClient } from "wagmi";
import { useFetchBlocks } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";

type AddressCodeTabProps = {
  bytecode: string;
  assembly: string;
};

type PageProps = {
  address: Address;
  contractData: AddressCodeTabProps | null;
};

export const ContractTabs = ({ address, contractData }: PageProps) => {
  const { blocks, transactionReceipts, currentPage, totalBlocks, setCurrentPage } = useFetchBlocks();
  const [activeTab, setActiveTab] = useState("transactions");
  const [isContract, setIsContract] = useState(false);

  const { targetNetwork } = useTargetNetwork();
  const publicClient = usePublicClient({ chainId: targetNetwork.id });

  useEffect(() => {
    const checkIsContract = async () => {
      if (!publicClient) return;
      const contractCode = await publicClient.getBytecode({ address: address });
      setIsContract(contractCode !== undefined && contractCode !== "0x");
    };

    checkIsContract();
  }, [address, publicClient]);

  const filteredBlocks = blocks.filter(block =>
    block.transactions.some(tx => {
      if (typeof tx === "string") {
        return false;
      }
      return tx.from.toLowerCase() === address.toLowerCase() || tx.to?.toLowerCase() === address.toLowerCase();
    }),
  );

  return (
    <>
      {isContract && (
        <div role="tablist" className="tabs tabs-lift">
          <button
            role="tab"
            className={`tab ${activeTab === "transactions" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("transactions")}
          >
            Transactions
          </button>
          <button
            role="tab"
            className={`tab ${activeTab === "code" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("code")}
          >
            Code
          </button>
          <button
            role="tab"
            className={`tab  ${activeTab === "storage" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("storage")}
          >
            Storage
          </button>
          <button
            role="tab"
            className={`tab  ${activeTab === "logs" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("logs")}
          >
            Logs
          </button>
        </div>
      )}
      {activeTab === "transactions" && (
        <div className="pt-4">
          <TransactionsTable blocks={filteredBlocks} transactionReceipts={transactionReceipts} />
          <PaginationButton
            currentPage={currentPage}
            totalItems={Number(totalBlocks)}
            setCurrentPage={setCurrentPage}
          />
        </div>
      )}
      {activeTab === "code" && contractData && (
        <AddressCodeTab bytecode={contractData.bytecode} assembly={contractData.assembly} />
      )}
      {activeTab === "storage" && <AddressStorageTab address={address} />}
      {activeTab === "logs" && <AddressLogsTab address={address} />}
    </>
  );
};
