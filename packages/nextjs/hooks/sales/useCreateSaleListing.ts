import { useState } from "react";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-hbar";
import { GAS_LIMITS, hbarToTinybars } from "~~/utils/hedera";

interface CreateListingParams {
  serialNumber: bigint;
  priceHbar: number;
  effectiveStartDate: bigint;
  isAuction?: boolean;
}

export const useCreateSaleListing = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { writeContractAsync } = useScaffoldWriteContract({
    contractName: "SubscriptionSalesMarketplace",
  });

  const createListing = async ({
    serialNumber,
    priceHbar,
    effectiveStartDate,
    isAuction = false,
  }: CreateListingParams) => {
    setIsCreating(true);
    setError(null);

    try {
      const priceTinybars = hbarToTinybars(priceHbar);

      if (isAuction) {
        await writeContractAsync({
          functionName: "createAuction",
          args: [serialNumber, priceTinybars, effectiveStartDate],
          gas: GAS_LIMITS.CREATE_SALE_LISTING,
        });
      } else {
        await writeContractAsync({
          functionName: "createFixedPriceListing",
          args: [serialNumber, priceTinybars, effectiveStartDate],
          gas: GAS_LIMITS.CREATE_SALE_LISTING,
        });
      }

      return true;
    } catch (err) {
      console.error("Failed to create listing:", err);
      setError(err instanceof Error ? err.message : "Failed to create listing");
      return false;
    } finally {
      setIsCreating(false);
    }
  };

  return { createListing, isCreating, error };
};
