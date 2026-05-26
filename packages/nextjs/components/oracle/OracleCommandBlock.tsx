"use client";

import { CheckIcon, ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { useCopyToClipboard } from "~~/hooks/scaffold-hbar";

type OracleCommandBlockProps = {
  command: string;
};

export const OracleCommandBlock = ({ command }: OracleCommandBlockProps) => {
  const { copyToClipboard, isCopiedToClipboard } = useCopyToClipboard();

  return (
    <div className="flex items-stretch gap-2">
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded bg-base-300 px-3 py-2 text-xs">
        {command}
      </code>
      <button
        type="button"
        className="btn btn-square btn-sm h-auto min-h-0 shrink-0 rounded-lg"
        onClick={() => copyToClipboard(command)}
        aria-label={isCopiedToClipboard ? "Command copied" : "Copy command"}
      >
        {isCopiedToClipboard ? (
          <CheckIcon className="h-4 w-4 text-success" />
        ) : (
          <ClipboardDocumentIcon className="h-4 w-4" />
        )}
      </button>
    </div>
  );
};
