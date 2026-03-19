"use client";

import React from "react";
import { proofWallConfig } from "~~/config/proofWallConfig";
import { useBadgeTokens } from "~~/hooks/useBadgeTokens";

type BadgeDisplayProps = {
  accountIdOrEvm: string | null;
};

export function BadgeDisplay({ accountIdOrEvm }: BadgeDisplayProps) {
  const { data, isLoading, error } = useBadgeTokens(proofWallConfig.badgeTokenId || null, accountIdOrEvm);

  if (!accountIdOrEvm) {
    return <p className="text-base-content/60 text-sm">Connect wallet to see badges.</p>;
  }
  if (error || !proofWallConfig.badgeTokenId) {
    return null;
  }
  if (isLoading) {
    return <div className="h-8 w-20 rounded bg-base-200 animate-pulse" />;
  }
  if (!data) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-base-content/80">Proof Badge balance:</span>
      <span className="badge badge-primary">{data.balance}</span>
    </div>
  );
}
