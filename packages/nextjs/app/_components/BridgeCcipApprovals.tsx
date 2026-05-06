"use client";

import type { CcipApprovalStatus, CcipApprovalStep } from "~~/services/bridge";

type BridgeCcipApprovalsProps = {
  status: CcipApprovalStatus;
  steps: CcipApprovalStep[];
};

const getStepClassName = (step: CcipApprovalStep, status: CcipApprovalStatus) => {
  if (step.isApproved) return "badge badge-success badge-sm";
  if (status === "approving") return "badge badge-warning badge-sm";
  return "badge badge-ghost badge-sm";
};

export const BridgeCcipApprovals = ({ status, steps }: BridgeCcipApprovalsProps) => {
  const hasSteps = steps.length > 0;
  const isReady = status === "approvals_ready";

  if (!hasSteps || status === "unsupported" || status === "missing_config") return null;

  return (
    <div className="rounded-2xl border border-base-300 bg-base-200 p-4 text-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="m-0 font-semibold">CCIP approvals</p>
        <span className={isReady ? "badge badge-success badge-sm" : "badge badge-info badge-sm"}>
          {isReady ? "Ready" : "Required"}
        </span>
      </div>
      <div className="mt-3 grid gap-2">
        {steps.map(step => (
          <div key={step.id} className="flex items-center justify-between gap-3 text-base-content/75">
            <span>{step.label}</span>
            <span className={getStepClassName(step, status)}>{step.isApproved ? "Approved" : "Needed"}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
