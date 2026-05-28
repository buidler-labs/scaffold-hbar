import { Address } from "@scaffold-hbar-ui/components";
import type { Address as ViemAddress } from "viem";
import { OracleCommandBlock } from "~~/components/oracle/OracleCommandBlock";

type OracleDeploymentItemProps = {
  address?: ViemAddress;
  command?: string;
  emptyText?: string;
  eyebrow: string;
  statusClassName: string;
  statusLabel: string;
  title: string;
  note?: string;
};

export const OracleDeploymentItem = ({
  address,
  command,
  emptyText = "Not deployed",
  eyebrow,
  note,
  statusClassName,
  statusLabel,
  title,
}: OracleDeploymentItemProps) => {
  return (
    <div className="grid min-h-36 grid-rows-[auto_auto_1fr] rounded-lg border border-base-300 bg-base-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="m-0 text-xs font-semibold uppercase tracking-wide text-base-content/50">{eyebrow}</p>
        <span className={`badge ${statusClassName}`}>{statusLabel}</span>
      </div>
      <p className="m-0 mt-5 break-all text-lg font-semibold leading-tight">{title}</p>
      <div className="mt-4 min-h-6 min-w-0 self-start">
        {address ? (
          <Address address={address} size="sm" />
        ) : command ? (
          <OracleCommandBlock command={command} />
        ) : (
          <span className="text-sm text-base-content/60">{emptyText}</span>
        )}
      </div>
      {note ? <p className="m-0 mt-2 text-xs leading-5 text-base-content/60">{note}</p> : null}
    </div>
  );
};
