export const HBAR_PRICE_CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes cache
export const HBAR_PRICE_URL = "https://api.coingecko.com/api/v3/simple/price?ids=hedera-hashgraph&vs_currencies=usd";

type HbarPriceCache = {
  price: number;
  timestamp: number;
};

let cache: HbarPriceCache | null = null;

export async function fetchHbarPrice(): Promise<number> {
  const now = Date.now();

  // Return cached price if still valid
  if (cache && now - cache.timestamp < HBAR_PRICE_CACHE_DURATION_MS) {
    return cache.price;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(HBAR_PRICE_URL, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const price = data?.["hedera-hashgraph"]?.usd ?? 0;

    if (price > 0) {
      cache = { price, timestamp: now };
    }

    return price || cache?.price || 0;
  } catch {
    // Silently fail and return cached price or 0
    // This prevents console spam from intermittent network issues
    return cache?.price ?? 0;
  }
}
