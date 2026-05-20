"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PendingSubscriptionCard } from "./PendingSubscriptionCard";
import { SubscriptionCardWithData } from "./SubscriptionCardWithData";
import { useAccount } from "wagmi";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { SubscriptionCardSkeleton } from "~~/components/marketplace";
import { useScaffoldEventHistory } from "~~/hooks/scaffold-hbar";

const ITEMS_PER_PAGE = 6;
const POLL_INTERVAL = 3000; // Poll every 3 seconds when there's a pending subscription

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
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [pendingSubscription, setPendingSubscription] = useState<PendingSubscription | null>(null);
  const [previousCount, setPreviousCount] = useState<number | null>(null);

  const {
    data: mintEvents,
    isLoading: isLoadingEvents,
    refetch,
  } = useScaffoldEventHistory({
    contractName: "SubscriptionNFT",
    eventName: "SubscriptionMinted",
    watch: false,
  });

  // Get owned serial numbers, sorted by serial number descending (newest first)
  const ownedSerialNumbers = useMemo(() => {
    if (!mintEvents || !connectedAddress) {
      return [];
    }

    return mintEvents
      .filter(event => event.args && event.args.recipient?.toLowerCase() === connectedAddress.toLowerCase())
      .map(event => event.args.serialNumber as bigint)
      .sort((a, b) => (b > a ? 1 : b < a ? -1 : 0)); // Sort descending (newest/highest serial first)
  }, [mintEvents, connectedAddress]);

  // Check for pending subscription on mount
  useEffect(() => {
    const stored = sessionStorage.getItem("pendingSubscription");
    if (stored) {
      try {
        const pending = JSON.parse(stored) as PendingSubscription;
        // Only show if less than 5 minutes old
        if (Date.now() - pending.timestamp < 5 * 60 * 1000) {
          setPendingSubscription(pending);
          setPreviousCount(ownedSerialNumbers.length);
        } else {
          sessionStorage.removeItem("pendingSubscription");
        }
      } catch {
        sessionStorage.removeItem("pendingSubscription");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll for new subscriptions while pending
  useEffect(() => {
    if (!pendingSubscription) return;

    const interval = setInterval(() => {
      refetch();
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [pendingSubscription, refetch]);

  // Check if the pending subscription has been confirmed
  useEffect(() => {
    if (pendingSubscription && previousCount !== null && ownedSerialNumbers.length > previousCount) {
      // New subscription appeared, clear pending state
      sessionStorage.removeItem("pendingSubscription");
      setPendingSubscription(null);
      setPreviousCount(null);
    }
  }, [ownedSerialNumbers.length, pendingSubscription, previousCount]);

  const visibleSerialNumbers = ownedSerialNumbers.slice(0, visibleCount);
  const hasMore = visibleCount < ownedSerialNumbers.length;
  const remainingCount = ownedSerialNumbers.length - visibleCount;

  const handleRefresh = useCallback(() => {
    setVisibleCount(ITEMS_PER_PAGE);
    refetch();
  }, [refetch]);

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + ITEMS_PER_PAGE);
  };

  const handleShowAll = () => {
    setVisibleCount(ownedSerialNumbers.length);
  };

  if (!connectedAddress) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🔌</div>
        <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
        <p className="text-base-content/60">Connect your wallet to see your subscription NFTs</p>
      </div>
    );
  }

  if (isLoadingEvents) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <SubscriptionCardSkeleton count={3} />
      </div>
    );
  }

  // Show pending subscription even if no confirmed ones exist yet
  if (ownedSerialNumbers.length === 0 && !pendingSubscription) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📭</div>
        <h3 className="text-xl font-semibold mb-2">No Subscriptions Yet</h3>
        <p className="text-base-content/60 mb-4">
          You don&apos;t own any subscription NFTs yet. Mint one to get started!
        </p>
        <div className="flex gap-2 justify-center">
          <a href="/mint" className="btn btn-primary">
            Mint Subscription
          </a>
          <button onClick={handleRefresh} className="btn btn-outline btn-sm">
            <ArrowPathIcon className="h-4 w-4" />
            Refresh
          </button>
        </div>
        <p className="text-xs text-base-content/40 mt-4">
          Connected: {connectedAddress?.slice(0, 6)}...{connectedAddress?.slice(-4)}
        </p>
        {mintEvents && <p className="text-xs text-base-content/40">Total events found: {mintEvents.length}</p>}
      </div>
    );
  }

  const totalCount = ownedSerialNumbers.length + (pendingSubscription ? 1 : 0);
  const showingCount = visibleSerialNumbers.length + (pendingSubscription ? 1 : 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-base-content/60">
          {pendingSubscription ? (
            <span className="flex items-center gap-2">
              <span className="loading loading-spinner loading-xs"></span>
              Processing new subscription...
            </span>
          ) : (
            `Showing ${showingCount} of ${totalCount} subscriptions`
          )}
        </p>
        <button onClick={handleRefresh} className="btn btn-outline btn-sm">
          <ArrowPathIcon className="h-4 w-4" />
          Refresh
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pendingSubscription && <PendingSubscriptionCard subscription={pendingSubscription} />}
        {visibleSerialNumbers.map(serialNumber => (
          <SubscriptionCardWithData
            key={serialNumber.toString()}
            serialNumber={serialNumber}
            onCreateListing={onCreateListing}
          />
        ))}
      </div>
      {hasMore && (
        <div className="flex justify-center gap-4 mt-8">
          <button onClick={handleLoadMore} className="btn btn-primary">
            Load More ({remainingCount} remaining)
          </button>
          {remainingCount > ITEMS_PER_PAGE && (
            <button onClick={handleShowAll} className="btn btn-outline">
              Show All
            </button>
          )}
        </div>
      )}
    </div>
  );
};
