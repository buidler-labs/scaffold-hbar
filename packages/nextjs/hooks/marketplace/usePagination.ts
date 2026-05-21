"use client";

import { useCallback, useMemo, useState } from "react";
import { DEFAULT_PAGE_SIZE } from "~~/utils/hedera";

interface UsePaginationOptions<T> {
  items: T[];
  pageSize?: number;
}

interface UsePaginationResult<T> {
  visibleItems: T[];
  visibleCount: number;
  totalCount: number;
  hasMore: boolean;
  remainingCount: number;
  loadMore: () => void;
  showAll: () => void;
  reset: () => void;
}

/**
 * Custom hook for handling pagination logic.
 * Provides load more, show all, and reset functionality.
 */
export function usePagination<T>({
  items,
  pageSize = DEFAULT_PAGE_SIZE,
}: UsePaginationOptions<T>): UsePaginationResult<T> {
  const [visibleCount, setVisibleCount] = useState(pageSize);

  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);

  const hasMore = visibleCount < items.length;
  const remainingCount = Math.max(0, items.length - visibleCount);

  const loadMore = useCallback(() => {
    setVisibleCount(prev => prev + pageSize);
  }, [pageSize]);

  const showAll = useCallback(() => {
    setVisibleCount(items.length);
  }, [items.length]);

  const reset = useCallback(() => {
    setVisibleCount(pageSize);
  }, [pageSize]);

  return {
    visibleItems,
    visibleCount: visibleItems.length,
    totalCount: items.length,
    hasMore,
    remainingCount,
    loadMore,
    showAll,
    reset,
  };
}
