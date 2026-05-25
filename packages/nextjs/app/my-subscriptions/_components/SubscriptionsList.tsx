"use client";

import { useCallback, useMemo } from "react";
import { PendingSubscriptionCard } from "./PendingSubscriptionCard";
import { SubscriptionCardWithData } from "./SubscriptionCardWithData";
import { useAccount } from "wagmi";
import {
  ConnectWalletState,
  ListHeader,
  LoadMoreButton,
  NoSubscriptionsState,
  SubscriptionCardSkeleton,
} from "~~/components/marketplace";
import { usePagination, usePendingItem } from "~~/hooks/marketplace";
import { useScaffoldEventHistory } from "~~/hooks/scaffold-hbar";
import { STORAGE_KEYS } from "~~/utils/hedera";

interface PendingSubscription {
  provider: string;
  serviceTier: string;
  startDate: number;
  endDate: number;
  timestamp: number;
}

interface SubscriptionsListProps {
  onCreateListing: (serialNumber: bigint) => void;
  onListForSale: (serialNumber: bigint) => void;
}

export const SubscriptionsList = ({ onCreateListing, onListForSale }: SubscriptionsListProps) => {
  const { address: connectedAddress } = useAccount();

  // Get minted subscriptions
  const {
    data: mintEvents,
    isLoading: isLoadingMints,
    isFetching: isFetchingMints,
    refetch: refetchMints,
  } = useScaffoldEventHistory({
    contractName: "SubscriptionNFT",
    eventName: "SubscriptionMinted",
    watch: false,
  });

  // Get purchased subscriptions from sales marketplace
  const {
    data: purchaseEvents,
    isLoading: isLoadingPurchases,
    isFetching: isFetchingPurchases,
    refetch: refetchPurchases,
  } = useScaffoldEventHistory({
    contractName: "SubscriptionSalesMarketplace",
    eventName: "ListingSold",
    watch: false,
  });

  // Get sold subscriptions (to exclude from owned list)
  const soldSerialNumbers = useMemo(() => {
    if (!purchaseEvents || !connectedAddress) return new Set<string>();

    const sold = new Set<string>();
    purchaseEvents.forEach(event => {
      // If connected user was the seller, they no longer own this NFT
      if (event.args?.seller?.toLowerCase() === connectedAddress.toLowerCase()) {
        sold.add((event.args.serialNumber as bigint).toString());
      }
    });
    return sold;
  }, [purchaseEvents, connectedAddress]);

  // Get owned serial numbers from both minting and purchases
  const ownedSerialNumbers = useMemo(() => {
    if (!connectedAddress) return [];

    const owned = new Map<string, bigint>();

    // Add minted NFTs (if still owned)
    if (mintEvents) {
      mintEvents.forEach(event => {
        if (event.args?.recipient?.toLowerCase() === connectedAddress.toLowerCase()) {
          const serial = event.args.serialNumber as bigint;
          if (!soldSerialNumbers.has(serial.toString())) {
            owned.set(serial.toString(), serial);
          }
        }
      });
    }

    // Add purchased NFTs
    if (purchaseEvents) {
      purchaseEvents.forEach(event => {
        if (event.args?.buyer?.toLowerCase() === connectedAddress.toLowerCase()) {
          const serial = event.args.serialNumber as bigint;
          // Only add if not subsequently sold
          if (!soldSerialNumbers.has(serial.toString())) {
            owned.set(serial.toString(), serial);
          }
        }
      });
    }

    return Array.from(owned.values()).sort((a, b) => (b > a ? 1 : b < a ? -1 : 0));
  }, [mintEvents, purchaseEvents, soldSerialNumbers, connectedAddress]);

  const isLoadingEvents = isLoadingMints || isLoadingPurchases;
  const isFetching = isFetchingMints || isFetchingPurchases;

  const refetch = useCallback(() => {
    refetchMints();
    refetchPurchases();
  }, [refetchMints, refetchPurchases]);

  // Handle pending subscription with optimistic UI
  const { pendingItem: pendingSubscription, isPending } = usePendingItem<PendingSubscription>({
    storageKey: STORAGE_KEYS.PENDING_SUBSCRIPTION,
    currentCount: ownedSerialNumbers.length,
    isLoading: isLoadingEvents,
    refetch,
  });

  // Handle pagination
  const { visibleItems, visibleCount, hasMore, remainingCount, loadMore, showAll, reset } = usePagination({
    items: ownedSerialNumbers,
  });

  const handleRefresh = useCallback(() => {
    reset();
    refetch();
  }, [reset, refetch]);

  if (!connectedAddress) {
    return <ConnectWalletState message="Connect your wallet to see your subscription NFTs" />;
  }

  if (isLoadingEvents) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <SubscriptionCardSkeleton count={3} />
      </div>
    );
  }

  if (ownedSerialNumbers.length === 0 && !pendingSubscription) {
    return <NoSubscriptionsState onRefresh={handleRefresh} />;
  }

  const totalCount = ownedSerialNumbers.length + (pendingSubscription ? 1 : 0);
  const showingCount = visibleCount + (pendingSubscription ? 1 : 0);

  return (
    <div>
      <ListHeader
        showingCount={showingCount}
        totalCount={totalCount}
        itemName="subscriptions"
        onRefresh={handleRefresh}
        isPending={isPending}
        pendingMessage="Processing new subscription..."
        isRefreshing={isFetching}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pendingSubscription && <PendingSubscriptionCard subscription={pendingSubscription} />}
        {visibleItems.map(serialNumber => (
          <SubscriptionCardWithData
            key={serialNumber.toString()}
            serialNumber={serialNumber}
            onCreateListing={onCreateListing}
            onListForSale={onListForSale}
          />
        ))}
      </div>
      {hasMore && <LoadMoreButton remainingCount={remainingCount} onLoadMore={loadMore} onShowAll={showAll} />}
    </div>
  );
};
