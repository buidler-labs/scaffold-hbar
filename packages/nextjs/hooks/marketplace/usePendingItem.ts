"use client";

import { useCallback, useEffect, useState } from "react";
import { PENDING_EXPIRY_MS, POLL_INTERVAL_MS } from "~~/utils/hedera";

interface UsePendingItemOptions<T> {
  storageKey: string;
  currentCount: number;
  isLoading: boolean;
  refetch: () => void;
}

interface UsePendingItemResult<T> {
  pendingItem: T | null;
  isPending: boolean;
  clearPending: () => void;
}

/**
 * Custom hook for handling optimistic UI with pending items.
 * Manages sessionStorage persistence, polling, and auto-clearing when confirmed.
 */
export function usePendingItem<T extends { timestamp: number }>({
  storageKey,
  currentCount,
  isLoading,
  refetch,
}: UsePendingItemOptions<T>): UsePendingItemResult<T> {
  const [pendingItem, setPendingItem] = useState<T | null>(null);
  const [previousCount, setPreviousCount] = useState<number | null>(null);

  // Check for pending item once data has loaded
  useEffect(() => {
    if (isLoading) return;

    const stored = sessionStorage.getItem(storageKey);
    if (!stored) return;

    try {
      const pending = JSON.parse(stored) as T;
      const isExpired = Date.now() - pending.timestamp > PENDING_EXPIRY_MS;

      if (isExpired) {
        sessionStorage.removeItem(storageKey);
        return;
      }

      // Only initialize pending state once
      if (previousCount === null) {
        setPreviousCount(currentCount);
        setPendingItem(pending);
      }
    } catch {
      sessionStorage.removeItem(storageKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, currentCount]);

  // Poll while pending
  useEffect(() => {
    if (!pendingItem) return;

    const interval = setInterval(refetch, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [pendingItem, refetch]);

  // Clear pending when confirmed (count increased)
  useEffect(() => {
    if (pendingItem && previousCount !== null && currentCount > previousCount) {
      sessionStorage.removeItem(storageKey);
      setPendingItem(null);
      setPreviousCount(null);
    }
  }, [currentCount, pendingItem, previousCount, storageKey]);

  const clearPending = useCallback(() => {
    sessionStorage.removeItem(storageKey);
    setPendingItem(null);
    setPreviousCount(null);
  }, [storageKey]);

  return {
    pendingItem,
    isPending: pendingItem !== null,
    clearPending,
  };
}
