import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDeployedContractInfo } from "~~/hooks/scaffold-hbar/useDeployedContractInfo";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-hbar/useScaffoldWriteContract";
import { invalidateVaultQueries } from "~~/utils/scaffold-hbar/invalidateVaultQueries";

type UseCreateVaultOptions = {
  onSuccess?: () => void;
};

export const useCreateVault = (options?: UseCreateVaultOptions) => {
  const onSuccessRef = useRef(options?.onSuccess);
  useEffect(() => {
    onSuccessRef.current = options?.onSuccess;
  }, [options?.onSuccess]);

  const queryClient = useQueryClient();
  const { data: strategyInfo } = useDeployedContractInfo({ contractName: "MemejobDCAStrategy" });
  const { writeContractAsync, isPending } = useScaffoldWriteContract({
    contractName: "ScheduledVaultFactory",
  });

  const createVault = useCallback(async () => {
    if (!strategyInfo?.address) return;
    await writeContractAsync({
      functionName: "createVault",
      args: [strategyInfo.address],
    });
    await invalidateVaultQueries(queryClient);
    await queryClient.refetchQueries({ queryKey: ["readContract"] });
    onSuccessRef.current?.();
  }, [queryClient, strategyInfo?.address, writeContractAsync]);

  return {
    createVault,
    isPending,
    canCreate: !!strategyInfo?.address,
  };
};
