import { useCallback, useEffect, useState } from "react";
import { Block, Hash, Transaction, TransactionReceipt } from "viem";
import { usePublicClient } from "wagmi";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { decodeTransactionData } from "~~/utils/scaffold-eth";

const BLOCKS_PER_PAGE = 20;

export const useFetchBlocks = () => {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [transactionReceipts, setTransactionReceipts] = useState<{
    [key: string]: TransactionReceipt;
  }>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [totalBlocks, setTotalBlocks] = useState(0n);
  const [error, setError] = useState<Error | null>(null);

  const { targetNetwork } = useTargetNetwork();
  const client = usePublicClient({ chainId: targetNetwork.id });

  const fetchBlocks = useCallback(async () => {
    if (!client) return;
    setError(null);

    try {
      const blockNumber = await client.getBlockNumber();
      setTotalBlocks(blockNumber);

      const startingBlock = blockNumber - BigInt(currentPage * BLOCKS_PER_PAGE);
      const blockNumbersToFetch = Array.from(
        { length: Number(BLOCKS_PER_PAGE < startingBlock + 1n ? BLOCKS_PER_PAGE : startingBlock + 1n) },
        (_, i) => startingBlock - BigInt(i),
      );

      const blocksWithTransactions = blockNumbersToFetch.map(async blockNumber => {
        try {
          return client.getBlock({ blockNumber, includeTransactions: true });
        } catch (err) {
          setError(err instanceof Error ? err : new Error("An error occurred."));
          throw err;
        }
      });
      const fetchedBlocks = await Promise.all(blocksWithTransactions);

      fetchedBlocks.forEach(block => {
        block.transactions.forEach(tx => decodeTransactionData(tx as Transaction));
      });

      const txReceipts = await Promise.all(
        fetchedBlocks.flatMap(block =>
          block.transactions.map(async tx => {
            try {
              const receipt = await client.getTransactionReceipt({ hash: (tx as Transaction).hash });
              return { [(tx as Transaction).hash]: receipt };
            } catch (err) {
              setError(err instanceof Error ? err : new Error("An error occurred."));
              throw err;
            }
          }),
        ),
      );

      setBlocks(fetchedBlocks);
      setTransactionReceipts(prevReceipts => ({ ...prevReceipts, ...Object.assign({}, ...txReceipts) }));
    } catch (err) {
      setError(err instanceof Error ? err : new Error("An error occurred."));
    }
  }, [client, currentPage]);

  useEffect(() => {
    fetchBlocks();
  }, [fetchBlocks]);

  useEffect(() => {
    if (!client) return;

    return client.watchBlockNumber({
      onBlockNumber: async blockNumber => {
        if (currentPage !== 0) {
          setTotalBlocks(blockNumber);
          return;
        }

        try {
          const newBlock = await client.getBlock({ blockNumber, includeTransactions: true });

          if (newBlock.transactions.length > 0) {
            (newBlock.transactions as Transaction[]).forEach((tx: Transaction) =>
              decodeTransactionData(tx as Transaction),
            );

            const receipts = await Promise.all(
              (newBlock.transactions as Transaction[]).map(async (tx: Transaction) => {
                const receipt = await client.getTransactionReceipt({ hash: tx.hash });
                return { [tx.hash]: receipt };
              }),
            );

            setBlocks(prevBlocks => [newBlock, ...prevBlocks.slice(0, BLOCKS_PER_PAGE - 1)]);
            setTransactionReceipts(prevReceipts => ({ ...prevReceipts, ...Object.assign({}, ...receipts) }));
          }

          setTotalBlocks(blockNumber);
        } catch (err) {
          setError(err instanceof Error ? err : new Error("An error occurred."));
        }
      },
      pollingInterval: 4_000,
    });
  }, [client, currentPage]);

  return {
    blocks,
    transactionReceipts,
    currentPage,
    totalBlocks,
    setCurrentPage,
    error,
  };
};
