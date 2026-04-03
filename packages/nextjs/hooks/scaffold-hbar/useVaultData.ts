import { useMemo } from "react";
import { Address, decodeAbiParameters, zeroAddress } from "viem";
import { useBalance, useReadContract } from "wagmi";
import { DCA_CONFIG_PARAMS, ERC20_ABI, MEMEJOB_ABI, VAULT_ABI } from "~~/utils/scaffold-hbar/constants";

/** On-chain polling for vault dashboard (balances, quotes, schedule). Much cheaper than refetch every block. */
const VAULT_ONCHAIN_POLL_MS = 15_000;

export type DCAConfig = {
  memejob: Address;
  memeToken: Address;
  isBuy: boolean;
  amountPerRun: bigint;
  maxHbarIn: bigint;
};

export const useVaultData = (vaultAddress: Address | undefined) => {
  const balanceResult = useBalance({
    address: vaultAddress,
    query: { enabled: !!vaultAddress, refetchInterval: VAULT_ONCHAIN_POLL_MS },
  });

  const strategyConfigResult = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: "strategyConfig",
    query: { enabled: !!vaultAddress, refetchInterval: VAULT_ONCHAIN_POLL_MS },
  });

  const intervalResult = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: "intervalSeconds",
    query: { enabled: !!vaultAddress, refetchInterval: VAULT_ONCHAIN_POLL_MS },
  });

  const nextScheduleResult = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: "nextSchedule",
    query: { enabled: !!vaultAddress, refetchInterval: VAULT_ONCHAIN_POLL_MS },
  });

  const ownerResult = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: "owner",
    query: { enabled: !!vaultAddress, refetchInterval: VAULT_ONCHAIN_POLL_MS },
  });

  const strategyResult = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: "strategy",
    query: { enabled: !!vaultAddress, refetchInterval: VAULT_ONCHAIN_POLL_MS },
  });

  const consecutiveFailuresResult = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: "consecutiveFailures",
    query: { enabled: !!vaultAddress, refetchInterval: VAULT_ONCHAIN_POLL_MS },
  });

  const dcaConfig = useMemo<DCAConfig | undefined>(() => {
    const rawBytes = strategyConfigResult.data as `0x${string}` | undefined;
    if (!rawBytes || rawBytes === "0x") return undefined;
    try {
      const decoded = decodeAbiParameters(DCA_CONFIG_PARAMS, rawBytes);
      const d = decoded[0] as {
        memejob: Address;
        memeToken: Address;
        isBuy: boolean;
        amountPerRun: bigint;
        maxHbarIn: bigint;
      };
      return {
        memejob: d.memejob,
        memeToken: d.memeToken,
        isBuy: d.isBuy,
        amountPerRun: d.amountPerRun,
        maxHbarIn: d.maxHbarIn,
      };
    } catch {
      return undefined;
    }
  }, [strategyConfigResult.data]);

  const hasConfig = !!dcaConfig && dcaConfig.memeToken !== zeroAddress;
  const intervalSeconds = intervalResult.data as bigint | undefined;

  const tokenBalanceResult = useReadContract({
    address: hasConfig ? dcaConfig!.memeToken : undefined,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: vaultAddress ? [vaultAddress] : undefined,
    query: { enabled: !!vaultAddress && hasConfig, refetchInterval: VAULT_ONCHAIN_POLL_MS },
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
    address: hasConfig ? dcaConfig!.memejob : undefined,
    abi: MEMEJOB_ABI,
    functionName: "getAmountOut",
    args: hasConfig ? [dcaConfig!.memeToken, true, dcaConfig!.amountPerRun] : undefined,
    query: { enabled: hasConfig && dcaConfig!.isBuy, refetchInterval: VAULT_ONCHAIN_POLL_MS },
  });

  const sellReturnResult = useReadContract({
    address: hasConfig ? dcaConfig!.memejob : undefined,
    abi: MEMEJOB_ABI,
    functionName: "getAmountOut",
    args: hasConfig ? [dcaConfig!.memeToken, false, dcaConfig!.amountPerRun] : undefined,
    query: { enabled: hasConfig && !dcaConfig!.isBuy, refetchInterval: VAULT_ONCHAIN_POLL_MS },
  });

  return {
    hbarBalance: balanceResult.data,
    dcaConfig,
    hasConfig,
    intervalSeconds,
    nextSchedule: nextScheduleResult.data as Address | undefined,
    owner: ownerResult.data as Address | undefined,
    strategy: strategyResult.data as Address | undefined,
    consecutiveFailures: consecutiveFailuresResult.data as bigint | undefined,
    tokenBalance: tokenBalanceResult.data as bigint | undefined,
    tokenSymbol: tokenSymbolResult.data as string | undefined,
    tokenDecimals: tokenDecimalsResult.data as number | undefined,
    buyCost: buyCostResult.data as bigint | undefined,
    sellReturn: sellReturnResult.data as bigint | undefined,
    isLoading: strategyConfigResult.isLoading || ownerResult.isLoading,
  };
};
