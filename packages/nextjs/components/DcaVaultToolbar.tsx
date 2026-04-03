"use client";

import { CreateVaultButton } from "~~/components/CreateVaultButton";

type DcaVaultToolbarProps = {
  /** Optional callback after a new vault tx completes (e.g. scroll, analytics). */
  onVaultCreated?: () => void;
};

export const DcaVaultToolbar = ({ onVaultCreated }: DcaVaultToolbarProps) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 px-4 py-3 bg-base-100 rounded-2xl border border-base-300 shadow-sm">
      <p className="text-sm text-base-content/60 m-0">
        Interact with your latest deployed vault below, or deploy a new one.
      </p>
      <CreateVaultButton
        variant="outline"
        size="sm"
        onSuccess={onVaultCreated}
        idleLabel="Deploy new vault"
        pendingLabel="Deploying…"
      />
    </div>
  );
};
