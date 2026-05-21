import { ArrowPathIcon } from "@heroicons/react/24/outline";

interface ListHeaderProps {
  showingCount: number;
  totalCount: number;
  itemName?: string;
  onRefresh: () => void;
  isPending?: boolean;
  pendingMessage?: string;
  isRefreshing?: boolean;
}

export const ListHeader = ({
  showingCount,
  totalCount,
  itemName = "items",
  onRefresh,
  isPending = false,
  pendingMessage = "Processing...",
  isRefreshing = false,
}: ListHeaderProps) => {
  return (
    <div className="flex items-center justify-between mb-4">
      <p className="text-sm text-base-content/60">
        {isPending ? (
          <span className="flex items-center gap-2">
            <span className="loading loading-spinner loading-xs"></span>
            {pendingMessage}
          </span>
        ) : (
          `Showing ${showingCount} of ${totalCount} ${itemName}`
        )}
      </p>
      <button onClick={onRefresh} className="btn btn-outline btn-sm" disabled={isRefreshing}>
        {isRefreshing ? (
          <span className="loading loading-spinner loading-xs"></span>
        ) : (
          <ArrowPathIcon className="h-4 w-4" />
        )}
        {isRefreshing ? "Refreshing..." : "Refresh"}
      </button>
    </div>
  );
};
