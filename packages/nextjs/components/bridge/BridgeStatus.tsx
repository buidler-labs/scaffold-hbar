"use client";

import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import type { BridgeReadiness } from "~~/services/bridge";

type BridgeStatusProps = {
  isChecking: boolean;
  isConnected: boolean;
  readiness: BridgeReadiness;
};

export const BridgeStatus = ({ isChecking, isConnected, readiness }: BridgeStatusProps) => {
  if (isChecking) {
    return (
      <div className="alert border-base-300 bg-base-200 text-base-content">
        <span className="loading loading-spinner loading-sm" />
        <span>Checking bridge config and deployed contracts.</span>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="alert border-info/20 bg-info/10 text-info">
        <InformationCircleIcon className="h-5 w-5" />
        <span>Connect your wallet to check the selected source network.</span>
      </div>
    );
  }

  if (readiness.status === "ready") {
    return (
      <div className="alert border-success/20 bg-success/10 text-success">
        <CheckCircleIcon className="h-5 w-5" />
        <span>{readiness.reason}</span>
      </div>
    );
  }

  return (
    <div className="alert border-warning/20 bg-warning/10 text-warning">
      <ExclamationTriangleIcon className="h-5 w-5" />
      <span>{readiness.reason}</span>
    </div>
  );
};
