"use client";

import { ArrowsRightLeftIcon } from "@heroicons/react/24/outline";
import { BRIDGE_DIRECTIONS, BRIDGE_NETWORKS, type BridgeDirection, getOppositeDirection } from "~~/services/bridge";

type BridgeDirectionSelectorProps = {
  direction: BridgeDirection;
  onChangeDirection: (direction: BridgeDirection) => void;
};

export const BridgeDirectionSelector = ({ direction, onChangeDirection }: BridgeDirectionSelectorProps) => {
  const routeDirection = BRIDGE_DIRECTIONS[direction];
  const source = BRIDGE_NETWORKS[routeDirection.sourceChainId];
  const destination = BRIDGE_NETWORKS[routeDirection.destinationChainId];

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
      <NetworkPanel label="From" value={source.label} />
      <button
        type="button"
        className="btn btn-circle btn-sm"
        onClick={() => onChangeDirection(getOppositeDirection(direction))}
        aria-label="Swap bridge direction"
      >
        <ArrowsRightLeftIcon className="h-4 w-4" />
      </button>
      <NetworkPanel label="To" value={destination.label} alignRight />
    </div>
  );
};

const NetworkPanel = ({ label, value, alignRight }: { label: string; value: string; alignRight?: boolean }) => (
  <div className={`min-w-0 rounded-lg border border-base-300 bg-base-200 px-4 py-3 ${alignRight ? "text-right" : ""}`}>
    <p className="m-0 text-xs font-semibold uppercase tracking-wide text-base-content/50">{label}</p>
    <p className="m-0 mt-1 truncate text-sm font-semibold">{value}</p>
  </div>
);
