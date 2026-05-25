import { useState } from "react";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-hbar";
import { GAS_LIMITS, tinybarsToWei } from "~~/utils/hedera";

interface BuyListingParams {
  listingId: bigint;
  priceTinybars: bigint;
}

export const useBuySaleListing = () => {
  const [isBuying, setIsBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { writeContractAsync } = useScaffoldWriteContract({
    contractName: "SubscriptionSalesMarketplace",
  });

  const buy = async ({ listingId, priceTinybars }: BuyListingParams) => {
    setIsBuying(true);
    setError(null);

    try {
      const priceWei = tinybarsToWei(priceTinybars);

      await writeContractAsync({
        functionName: "buy",
        args: [listingId],
        value: priceWei,
        gas: GAS_LIMITS.BUY,
      });

      return true;
    } catch (err) {
      console.error("Failed to buy listing:", err);
      setError(err instanceof Error ? err.message : "Failed to buy listing");
      return false;
    } finally {
      setIsBuying(false);
    }
  };

  return { buy, isBuying, error };
};
