/**
 * Types for deep imports from @scaffold-ui/hooks/dist/esm/*.js.
 * The package root re-exports wagmi-dependent modules; these entry points stay wagmi-free.
 */
declare module "@scaffold-ui/hooks/dist/esm/hbarPrice.js" {
  export const HBAR_PRICE_CACHE_DURATION_MS: number;
  export function fetchHbarPrice(): Promise<number>;
}

declare module "@scaffold-ui/hooks/dist/esm/useFetchHbarPrice.js" {
  export function useFetchHbarPrice(): { price: number; isLoading: boolean };
}

declare module "@scaffold-ui/hooks/dist/esm/useAddress.js" {
  import type { Chain } from "viem";
  export function getBlockExplorerAddressLink(network: Chain, address: string): string;
}
