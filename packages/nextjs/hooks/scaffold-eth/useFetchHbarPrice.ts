import { useCallback, useEffect, useState } from "react";
import { HBAR_PRICE_CACHE_DURATION_MS, fetchHbarPrice } from "~~/utils/scaffold-hbar";

export function useFetchHbarPrice(): { price: number; isLoading: boolean } {
  const [price, setPrice] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const value = await fetchHbarPrice();
    setPrice(value);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, HBAR_PRICE_CACHE_DURATION_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  return { price, isLoading };
}
