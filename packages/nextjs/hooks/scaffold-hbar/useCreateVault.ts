import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDeployedContractInfo } from "~~/hooks/scaffold-hbar/useDeployedContractInfo";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-hbar/useScaffoldWriteContract";
import { useSelectedNetwork } from "~~/hooks/scaffold-hbar/useSelectedNetwork";
import { ContractName } from "~~/utils/scaffold-hbar/contract";
import { contracts } from "~~/utils/scaffold-hbar/contract";
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
  const selectedNetwork = useSelectedNetwork();
  const isFactoryConfigured = !!contracts?.[selectedNetwork.id]?.ScheduledVaultFactory?.address;
  const { data: strategyInfo } = useDeployedContractInfo({
    contractName: "MemejobDCAStrategy" as ContractName,
  });
  const { writeContractAsync, isPending } = useScaffoldWriteContract({
    contractName: "ScheduledVaultFactory" as ContractName,
  });

  const canCreate = isFactoryConfigured && !!strategyInfo?.address;
  const disabledReason = !canCreate
    ? "Make sure all required scheduler contracts are deployed on the selected network. Check the README deployment steps."
    : undefined;

  const createVault = useCallback(async () => {
    if (!canCreate || !strategyInfo?.address) return;
    await (writeContractAsync as (variables: any) => Promise<unknown>)({
      functionName: "createVault",
      args: [strategyInfo.address],
    });
    await invalidateVaultQueries(queryClient);
    await queryClient.refetchQueries({ queryKey: ["readContract"] });
    onSuccessRef.current?.();
  }, [canCreate, queryClient, strategyInfo?.address, writeContractAsync]);

  return {
    createVault,
    isPending,
    canCreate,
    disabledReason,
  };
};
