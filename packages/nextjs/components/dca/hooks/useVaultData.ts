import { useEffect } from "react";
import { ERC20_ABI, VAULT_ABI } from "../constants";
import { useQueryClient } from "@tanstack/react-query";
import { Address, zeroAddress } from "viem";
import { useBalance, useBlockNumber, useReadContract } from "wagmi";

export const useVaultData = (vaultAddress: Address | undefined) => {
  const queryClient = useQueryClient();
  const { data: blockNumber } = useBlockNumber({ watch: true });

  const balanceResult = useBalance({
    address: vaultAddress,
    query: { enabled: !!vaultAddress },
  });

  const dcaConfigResult = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: "dcaConfig",
    query: { enabled: !!vaultAddress },
  });

  const nextScheduleResult = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: "nextSchedule",
    query: { enabled: !!vaultAddress },
  });

  const ownerResult = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: "owner",
    query: { enabled: !!vaultAddress },
  });

  const rawConfig = dcaConfigResult.data;
  const dcaConfig = rawConfig
    ? {
        memeToken: rawConfig[0] as Address,
        mode: Number(rawConfig[1]),
        amountPerRun: rawConfig[2] as bigint,
        intervalSeconds: rawConfig[3] as bigint,
      }
    : undefined;

  const hasConfig = !!dcaConfig && dcaConfig.memeToken !== zeroAddress;

  const tokenBalanceResult = useReadContract({
    address: hasConfig ? dcaConfig!.memeToken : undefined,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: vaultAddress ? [vaultAddress] : undefined,
    query: { enabled: !!vaultAddress && hasConfig },
  });

  const tokenSymbolResult = useReadContract({
    address: hasConfig ? dcaConfig!.memeToken : undefined,
    abi: ERC20_ABI,
    functionName: "symbol",
    query: { enabled: hasConfig },
  });

  const tokenDecimalsResult = useReadContract({
    address: hasConfig ? dcaConfig!.memeToken : undefined,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: { enabled: hasConfig },
  });

  const buyCostResult = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: "getBuyCost",
    args: hasConfig ? [dcaConfig!.amountPerRun] : undefined,
    query: { enabled: !!vaultAddress && hasConfig && dcaConfig!.mode === 0 },
  });

  const sellReturnResult = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: "getSellReturn",
    args: hasConfig ? [dcaConfig!.amountPerRun] : undefined,
    query: { enabled: !!vaultAddress && hasConfig && dcaConfig!.mode === 1 },
  });

  const allQueryKeys = [
    balanceResult.queryKey,
    dcaConfigResult.queryKey,
    nextScheduleResult.queryKey,
    ownerResult.queryKey,
    tokenBalanceResult.queryKey,
    buyCostResult.queryKey,
    sellReturnResult.queryKey,
  ];

  useEffect(() => {
    if (blockNumber) {
      allQueryKeys.forEach(key => queryClient.invalidateQueries({ queryKey: key }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockNumber]);

  return {
    hbarBalance: balanceResult.data,
    dcaConfig,
    hasConfig,
    nextSchedule: nextScheduleResult.data as Address | undefined,
    owner: ownerResult.data as Address | undefined,
    tokenBalance: tokenBalanceResult.data as bigint | undefined,
    tokenSymbol: tokenSymbolResult.data as string | undefined,
    tokenDecimals: tokenDecimalsResult.data as number | undefined,
    buyCost: buyCostResult.data as bigint | undefined,
    sellReturn: sellReturnResult.data as bigint | undefined,
    isLoading: dcaConfigResult.isLoading || ownerResult.isLoading,
  };
};
