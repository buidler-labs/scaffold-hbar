export const HBAR_PRICE_CACHE_DURATION_MS = 60 * 1000;
export const HBAR_PRICE_URL = "https://api.coingecko.com/api/v3/coins/hedera-hashgraph";

type CoingeckoHbarResponse = {
  market_data?: {
    current_price?: { usd?: number };
  };
};

type HbarPriceCache = {
  price: number;
  timestamp: number;
};

let cache: HbarPriceCache | null = null;

export async function fetchHbarPrice(): Promise<number> {
  const now = Date.now();
  if (cache && now - cache.timestamp < HBAR_PRICE_CACHE_DURATION_MS) {
    return cache.price;
  }

  try {
    const response = await fetch(HBAR_PRICE_URL);
    const data = (await response.json()) as CoingeckoHbarResponse;
    const price = data.market_data?.current_price?.usd ?? 0;
    cache = { price, timestamp: now };
    return price;
  } catch (error) {
    console.error("Failed to fetch HBAR price:", error);
    return cache?.price ?? 0;
  }
}
