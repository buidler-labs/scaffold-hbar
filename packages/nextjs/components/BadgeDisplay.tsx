"use client";

import React from "react";
import Link from "next/link";
import { proofWallConfig } from "~~/config/proofWallConfig";
import { useBadgeTokens } from "~~/hooks/useBadgeTokens";

const MILESTONES = [1, 5, 10, 25, 50, 100];

type BadgeDisplayProps = {
  accountIdOrEvm: string | null;
  variant?: "card" | "inline";
  proofCount?: number;
};

export function BadgeDisplay({ accountIdOrEvm, variant = "card", proofCount }: BadgeDisplayProps) {
  const { data, isLoading, error } = useBadgeTokens(proofWallConfig.badgeTokenId || null, accountIdOrEvm);
  const hasBadgeToken = Boolean(proofWallConfig.badgeTokenId);
  const balance = data?.balance ?? 0;
  const nextMilestone = MILESTONES.find(m => m > (proofCount ?? 0));

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
        <span className="badge badge-primary">{balance}</span>
      </div>
    );
  }

  return (
    <div className="card border border-base-300 bg-base-100 shadow-sm">
      <div className="card-body p-5 sm:p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold m-0">Proof Badges</h2>
          <span className="badge badge-outline badge-secondary">HTS</span>
        </div>
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
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 text-primary text-2xl font-bold shrink-0">
                {balance}
              </div>
              <div>
                <p className="font-medium m-0">
                  {balance} badge{balance !== 1 ? "s" : ""} earned
                </p>
                <p className="text-sm text-base-content/60 m-0">
                  {nextMilestone
                    ? `Next badge at ${nextMilestone} proof${nextMilestone !== 1 ? "s" : ""}`
                    : "All milestones reached!"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {MILESTONES.map(m => {
                const reached = balance > 0 && MILESTONES.indexOf(m) < balance;
                return (
                  <div
                    key={m}
                    className={`badge badge-lg ${reached ? "badge-primary" : "badge-ghost opacity-50"}`}
                    title={`${m} proof${m !== 1 ? "s" : ""} milestone`}
                  >
                    {m}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
