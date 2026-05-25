import { useState } from "react";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-hbar";
import { GAS_LIMITS } from "~~/utils/hedera";

interface CancelListingParams {
  listingId: bigint;
}

export const useCancelSaleListing = () => {
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { writeContractAsync } = useScaffoldWriteContract({
    contractName: "SubscriptionSalesMarketplace",
  });

  const cancelListing = async ({ listingId }: CancelListingParams) => {
    setIsCancelling(true);
    setError(null);

    try {
      await writeContractAsync({
        functionName: "cancelListing",
        args: [listingId],
        gas: GAS_LIMITS.CANCEL_LISTING,
      });

      return true;
    } catch (err) {
      console.error("Failed to cancel listing:", err);
      setError(err instanceof Error ? err.message : "Failed to cancel listing");
      return false;
    } finally {
      setIsCancelling(false);
    }
  };

  return { cancelListing, isCancelling, error };
};
