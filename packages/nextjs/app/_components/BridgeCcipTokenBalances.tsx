"use client";

import type { CcipTokenAccountStatus, CcipTokenBalance } from "~~/services/bridge";

type BridgeCcipTokenBalancesProps = {
  destinationToken?: CcipTokenBalance;
  showHtsAssociationNotice: boolean;
  sourceToken?: CcipTokenBalance;
  status: CcipTokenAccountStatus;
};

const getBalanceText = (token: CcipTokenBalance | undefined) => {
  if (!token?.tokenAddress) return "Not configured";
  return token.balanceLabel ?? "0";
};

const TokenBalanceRow = ({ token }: { token?: CcipTokenBalance }) => (
  <div className="min-w-0">
    <div className="flex min-w-0 items-center gap-2">
      <p className="m-0 truncate text-[0.68rem] font-semibold uppercase tracking-wide text-base-content/40">
        {token?.label ?? "Token balance"}
      </p>
      {token?.isHtsToken ? (
        <span className="badge badge-outline badge-xs shrink-0 text-base-content/50">HTS</span>
      ) : null}
    </div>
    <p className="m-0 mt-1 truncate text-sm font-semibold text-base-content/70">{getBalanceText(token)}</p>
  </div>
);

export const BridgeCcipTokenBalances = ({
  destinationToken,
  showHtsAssociationNotice,
  sourceToken,
  status,
}: BridgeCcipTokenBalancesProps) => {
  if (status === "idle") return null;

  return (
    <div className="grid gap-2">
      <div className="rounded-2xl border border-base-300/70 bg-base-200/40 px-4 py-3">
        <div className="grid gap-3 md:grid-cols-2">
          <TokenBalanceRow token={sourceToken} />
          <TokenBalanceRow token={destinationToken} />
        </div>
      </div>

      {status === "checking" ? (
        <div className="alert border-base-300/70 bg-base-200/40 text-base-content">
          <span className="loading loading-spinner loading-sm" />
          <span>Checking token balances.</span>
        </div>
      ) : null}

      {showHtsAssociationNotice ? (
        <div className="rounded-2xl border border-warning/20 bg-warning/10 px-4 py-3 text-sm text-warning">
          Make sure this wallet is associated with the Hedera HTS token before bridging.
        </div>
      ) : null}
    </div>
  );
};
