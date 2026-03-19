"use client";

import React from "react";
import Link from "next/link";
import { proofWallConfig } from "~~/config/proofWallConfig";
import { useBadgeTokens } from "~~/hooks/useBadgeTokens";

type BadgeDisplayProps = {
  accountIdOrEvm: string | null;
  /** Show as a card (e.g. on My Proofs page). Default true. */
  variant?: "card" | "inline";
};

export function BadgeDisplay({ accountIdOrEvm, variant = "card" }: BadgeDisplayProps) {
  const { data, isLoading, error } = useBadgeTokens(proofWallConfig.badgeTokenId || null, accountIdOrEvm);
  const hasBadgeToken = Boolean(proofWallConfig.badgeTokenId);

  if (!accountIdOrEvm) {
    return (
      <p className="text-base-content/60 text-sm">
        {variant === "card" ? "Connect your wallet to see your badge balance." : "Connect wallet to see badges."}
      </p>
    );
  }

  if (variant === "inline") {
    if (!hasBadgeToken) return null;
    if (error) return null;
    if (isLoading) return <div className="h-6 w-16 rounded bg-base-200 animate-pulse" />;
    if (!data) return null;
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-base-content/80">Proof Badges:</span>
        <span className="badge badge-primary">{data.balance}</span>
      </div>
    );
  }

  // Card variant
  return (
    <div className="rounded-xl border border-base-300 bg-base-100 p-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-3">Proof Badges</h2>
      {!hasBadgeToken ? (
        <p className="text-base-content/60 text-sm">
          No badge token configured. Create one in{" "}
          <Link href="/admin" className="link link-primary">
            Admin
          </Link>
          .
        </p>
      ) : isLoading ? (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-base-200 animate-pulse" />
          <div className="h-5 w-24 rounded bg-base-200 animate-pulse" />
        </div>
      ) : error ? (
        <p className="text-error text-sm">Couldn&apos;t load badge balance.</p>
      ) : data ? (
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-primary text-xl font-bold">
            {data.balance}
          </div>
          <div>
            <p className="font-medium">Balance</p>
            <p className="text-sm text-base-content/60">Earned from posting proofs</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
