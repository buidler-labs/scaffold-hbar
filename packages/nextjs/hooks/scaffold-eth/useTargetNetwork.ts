import { useMemo } from "react";
import { useGlobalState } from "~~/services/store/store";
import { ChainWithAttributes } from "~~/utils/scaffold-eth";

/**
 * Returns the currently selected target network from global state.
 * With Reown AppKit + HederaAdapter, network switching is handled by AppKit.
 */
export function useTargetNetwork(): { targetNetwork: ChainWithAttributes } {
  const targetNetwork = useGlobalState(({ targetNetwork }) => targetNetwork);
  return useMemo(() => ({ targetNetwork }), [targetNetwork]);
}
