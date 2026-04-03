"use client";

import { PlusIcon } from "@heroicons/react/24/outline";
import { useCreateVault } from "~~/hooks/scaffold-hbar/useCreateVault";

type CreateVaultButtonProps = {
  onSuccess?: () => void;
  /** DaisyUI button size */
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "outline";
  className?: string;
  showIcon?: boolean;
  children?: React.ReactNode;
  pendingLabel?: string;
  idleLabel?: string;
};

export const CreateVaultButton = ({
  onSuccess,
  size = "md",
  variant = "primary",
  className = "",
  showIcon = true,
  children,
  pendingLabel = "Creating vault…",
  idleLabel = "Create vault",
}: CreateVaultButtonProps) => {
  const { createVault, isPending, canCreate } = useCreateVault({ onSuccess });

  const sizeClass = size === "sm" ? "btn-sm" : size === "lg" ? "btn-lg" : "";
  const variantClass = variant === "outline" ? "btn-outline btn-primary" : "btn-primary";

  return (
    <button
      type="button"
      className={`btn ${sizeClass} ${variantClass} gap-2 ${className}`.trim()}
      disabled={isPending || !canCreate}
      onClick={() => void createVault()}
    >
      {isPending ? (
        <>
          <span className="loading loading-spinner loading-sm" />
          {pendingLabel}
        </>
      ) : (
        <>
          {showIcon && <PlusIcon className="h-4 w-4 shrink-0" />}
          {children ?? idleLabel}
        </>
      )}
    </button>
  );
};
