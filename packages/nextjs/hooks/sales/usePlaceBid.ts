import { useState } from "react";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-hbar";
import { GAS_LIMITS, hbarToTinybars, tinybarsToWei } from "~~/utils/hedera";

interface PlaceBidParams {
  listingId: bigint;
  bidAmountHbar: number;
}

export const usePlaceBid = () => {
  const [isBidding, setIsBidding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { writeContractAsync } = useScaffoldWriteContract({
    contractName: "SubscriptionSalesMarketplace",
  });

  const placeBid = async ({ listingId, bidAmountHbar }: PlaceBidParams) => {
    setIsBidding(true);
    setError(null);

    try {
      const bidTinybars = hbarToTinybars(bidAmountHbar);
      const bidWei = tinybarsToWei(bidTinybars);

      await writeContractAsync({
        functionName: "bid",
        args: [listingId],
        value: bidWei,
        gas: GAS_LIMITS.BID,
      });

      return true;
    } catch (err) {
      console.error("Failed to place bid:", err);
      setError(err instanceof Error ? err.message : "Failed to place bid");
      return false;
    } finally {
      setIsBidding(false);
    }
  };

  return { placeBid, isBidding, error };
};
