import { DEFAULT_PAGE_SIZE } from "~~/utils/hedera";

interface LoadMoreButtonProps {
  remainingCount: number;
  onLoadMore: () => void;
  onShowAll?: () => void;
  pageSize?: number;
}

export const LoadMoreButton = ({
  remainingCount,
  onLoadMore,
  onShowAll,
  pageSize = DEFAULT_PAGE_SIZE,
}: LoadMoreButtonProps) => {
  if (remainingCount <= 0) return null;

  return (
    <div className="flex justify-center gap-4 mt-8">
      <button onClick={onLoadMore} className="btn btn-primary">
        Load More ({remainingCount} remaining)
      </button>
      {onShowAll && remainingCount > pageSize && (
        <button onClick={onShowAll} className="btn btn-outline">
          Show All
        </button>
      )}
    </div>
  );
};
