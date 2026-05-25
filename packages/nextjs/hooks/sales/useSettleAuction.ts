import { useState } from "react";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-hbar";
import { GAS_LIMITS } from "~~/utils/hedera";

interface SettleAuctionParams {
  listingId: bigint;
}

export const useSettleAuction = () => {
  const [isSettling, setIsSettling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { writeContractAsync } = useScaffoldWriteContract({
    contractName: "SubscriptionSalesMarketplace",
  });

  const settle = async ({ listingId }: SettleAuctionParams) => {
    setIsSettling(true);
    setError(null);

    try {
      await writeContractAsync({
        functionName: "settleAuction",
        args: [listingId],
        gas: GAS_LIMITS.SETTLE,
      });

      return true;
    } catch (err) {
      console.error("Failed to settle auction:", err);
      setError(err instanceof Error ? err.message : "Failed to settle auction");
      return false;
    } finally {
      setIsSettling(false);
    }
  };

  return { settle, isSettling, error };
};
