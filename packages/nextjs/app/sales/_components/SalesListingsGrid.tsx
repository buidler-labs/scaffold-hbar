"use client";

import { useCallback, useMemo } from "react";
import { SalesListingCardSkeleton } from "./SalesListingCard";
import { SalesListingCardWithData } from "./SalesListingCardWithData";
import { CurrencyDollarIcon } from "@heroicons/react/24/outline";
import { ListHeader, LoadMoreButton } from "~~/components/marketplace";
import { usePagination } from "~~/hooks/marketplace";
import { useScaffoldEventHistory } from "~~/hooks/scaffold-hbar";

interface ListingEventData {
  id: bigint;
  serialNumber: bigint;
  seller: string;
  isAuction: boolean;
  price: bigint;
  effectiveStartDate?: bigint;
  auctionEndTime?: bigint;
}

const NoSalesListingsState = () => (
  <div className="card bg-base-100 border border-base-300 shadow-md rounded-xl p-8">
    <div className="text-center">
      <CurrencyDollarIcon className="h-16 w-16 mx-auto text-base-content/30" />
      <h3 className="text-xl font-semibold mt-4">No Subscriptions For Sale</h3>
      <p className="text-base-content/60 mt-2">
        No one is currently selling their subscription NFTs. Check back later or list your own!
      </p>
    </div>
  </div>
);

export const SalesListingsGrid = () => {
  const {
    data: fixedPriceEvents,
    isLoading: isLoadingFixed,
    isFetching: isFetchingFixed,
    refetch: refetchFixed,
  } = useScaffoldEventHistory({
    contractName: "SubscriptionSalesMarketplace",
    eventName: "FixedPriceListingCreated",
    watch: false,
  });

  const {
    data: auctionEvents,
    isLoading: isLoadingAuctions,
    isFetching: isFetchingAuctions,
    refetch: refetchAuctions,
  } = useScaffoldEventHistory({
    contractName: "SubscriptionSalesMarketplace",
    eventName: "AuctionCreated",
    watch: false,
  });

  const {
    data: soldEvents,
    isLoading: isLoadingSold,
    isFetching: isFetchingSold,
    refetch: refetchSold,
  } = useScaffoldEventHistory({
    contractName: "SubscriptionSalesMarketplace",
    eventName: "ListingSold",
    watch: false,
  });

  const {
    data: cancelledEvents,
    isLoading: isLoadingCancelled,
    isFetching: isFetchingCancelled,
    refetch: refetchCancelled,
  } = useScaffoldEventHistory({
    contractName: "SubscriptionSalesMarketplace",
    eventName: "ListingCancelled",
    watch: false,
  });

  const isLoadingEvents = isLoadingFixed || isLoadingAuctions || isLoadingSold || isLoadingCancelled;
  const isRefreshing = isFetchingFixed || isFetchingAuctions || isFetchingSold || isFetchingCancelled;

  const inactiveIds = useMemo(() => {
    const ids = new Set<string>();
    if (soldEvents) {
      soldEvents.forEach(e => {
        if (e.args?.listingId) ids.add((e.args.listingId as bigint).toString());
      });
    }
    if (cancelledEvents) {
      cancelledEvents.forEach(e => {
        if (e.args?.listingId) ids.add((e.args.listingId as bigint).toString());
      });
    }
    return ids;
  }, [soldEvents, cancelledEvents]);

  const listings = useMemo(() => {
    const allListings: ListingEventData[] = [];

    if (fixedPriceEvents) {
      fixedPriceEvents.forEach(event => {
        if (event.args && !inactiveIds.has((event.args.listingId as bigint).toString())) {
          allListings.push({
            id: event.args.listingId as bigint,
            serialNumber: event.args.serialNumber as bigint,
            seller: event.args.seller as string,
            isAuction: false,
            price: event.args.price as bigint,
            effectiveStartDate: event.args.effectiveStartDate as bigint,
          });
        }
      });
    }

    if (auctionEvents) {
      auctionEvents.forEach(event => {
        if (event.args && !inactiveIds.has((event.args.listingId as bigint).toString())) {
          allListings.push({
            id: event.args.listingId as bigint,
            serialNumber: event.args.serialNumber as bigint,
            seller: event.args.seller as string,
            isAuction: true,
            price: event.args.reservePrice as bigint,
            effectiveStartDate: event.args.effectiveStartDate as bigint,
            auctionEndTime: event.args.auctionEndTime as bigint,
          });
        }
      });
    }

    return allListings.sort((a, b) => (b.id > a.id ? 1 : b.id < a.id ? -1 : 0));
  }, [fixedPriceEvents, auctionEvents, inactiveIds]);

  const { visibleItems, visibleCount, totalCount, hasMore, remainingCount, loadMore, showAll, reset } = usePagination({
    items: listings,
  });

  const handleRefresh = useCallback(() => {
    reset();
    refetchFixed();
    refetchAuctions();
    refetchSold();
    refetchCancelled();
  }, [reset, refetchFixed, refetchAuctions, refetchSold, refetchCancelled]);

  if (isLoadingEvents) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <SalesListingCardSkeleton count={6} />
      </div>
    );
  }

  if (listings.length === 0) {
    return <NoSalesListingsState />;
  }

  return (
    <div>
      <ListHeader
        showingCount={visibleCount}
        totalCount={totalCount}
        itemName="listings"
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleItems.map(listing => (
          <SalesListingCardWithData
            key={listing.id.toString()}
            listingId={listing.id}
            serialNumber={listing.serialNumber}
            seller={listing.seller}
            isAuction={listing.isAuction}
            eventPrice={listing.price}
            eventEffectiveStartDate={listing.effectiveStartDate}
            eventAuctionEndTime={listing.auctionEndTime}
          />
        ))}
      </div>
      {hasMore && <LoadMoreButton remainingCount={remainingCount} onLoadMore={loadMore} onShowAll={showAll} />}
    </div>
  );
};
