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
}

export const SubscriptionsList = ({ onCreateListing }: SubscriptionsListProps) => {
  const { address: connectedAddress } = useAccount();

  const {
    data: mintEvents,
    isLoading: isLoadingEvents,
    isFetching,
    refetch,
  } = useScaffoldEventHistory({
    contractName: "SubscriptionNFT",
    eventName: "SubscriptionMinted",
    watch: false,
  });

  // Get owned serial numbers, sorted by serial number descending (newest first)
  const ownedSerialNumbers = useMemo(() => {
    if (!mintEvents || !connectedAddress) return [];

    return mintEvents
      .filter(event => event.args?.recipient?.toLowerCase() === connectedAddress.toLowerCase())
      .map(event => event.args.serialNumber as bigint)
      .sort((a, b) => (b > a ? 1 : b < a ? -1 : 0));
  }, [mintEvents, connectedAddress]);

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
          />
        ))}
      </div>
      {hasMore && <LoadMoreButton remainingCount={remainingCount} onLoadMore={loadMore} onShowAll={showAll} />}
    </div>
  );
};
