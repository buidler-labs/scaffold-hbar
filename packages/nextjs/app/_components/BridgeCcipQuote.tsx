"use client";

import type { CcipQuote } from "~~/services/bridge";

type BridgeCcipQuoteProps = {
  quote: CcipQuote;
};

export const BridgeCcipQuote = ({ quote }: BridgeCcipQuoteProps) => {
  switch (quote.status) {
    case "idle":
    case "unsupported":
      return null;

    case "quoting":
      return (
        <div className="alert border-base-300 bg-base-200 text-base-content">
          <span className="loading loading-spinner loading-sm" />
          <span>Quoting CCIP fee.</span>
        </div>
      );

    case "quoted":
      return (
        <div className="rounded-2xl border border-info/20 bg-info/10 p-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="m-0 font-semibold text-info">CCIP quote ready</p>
            <span className="badge badge-info badge-sm">Read only</span>
          </div>
          <div className="mt-3 grid gap-2 text-base-content/75">
            <div className="flex items-center justify-between gap-3">
              <span>Amount in base units</span>
              <span className="break-all font-mono text-xs">{quote.amountInBaseUnits?.toString()}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Estimated native fee</span>
              <span className="font-semibold">{quote.nativeFeeLabel}</span>
            </div>
          </div>
        </div>
      );

    default:
      return (
        <div className="alert border-warning/20 bg-warning/10 text-warning">
          <span>{quote.reason ?? "Unable to quote CCIP fee."}</span>
        </div>
      );
  }
};
