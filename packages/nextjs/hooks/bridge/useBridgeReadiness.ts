"use client";

import { useEffect, useMemo, useState } from "react";
import { usePublicClient } from "wagmi";
import type { BridgeDirection, BridgeProviderId, BridgeReadiness } from "~~/services/bridge";
import { getBridgeRoute, getRouteConfigIssue } from "~~/services/bridge/registry";

const initialReadiness: BridgeReadiness = {
  status: "misconfigured",
  reason: "Checking bridge config",
};

export const useBridgeReadiness = (
  providerId: BridgeProviderId,
  direction: BridgeDirection,
  walletChainId: number | undefined,
) => {
  const route = useMemo(() => getBridgeRoute(providerId, direction), [direction, providerId]);
  const sourceClient = usePublicClient({ chainId: route.sourceChainId });
  const destinationClient = usePublicClient({ chainId: route.destinationChainId });
  const [readiness, setReadiness] = useState<BridgeReadiness>(initialReadiness);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const checkReadiness = async () => {
      const configIssue = getRouteConfigIssue(route);
      if (configIssue) {
        setIsChecking(false);
        setReadiness({ status: "misconfigured", reason: configIssue });
        return;
      }

      if (walletChainId && walletChainId !== route.sourceChainId) {
        setIsChecking(false);
        setReadiness({
          status: "wrong_network",
          reason: "Wallet is connected to the wrong source network",
        });
        return;
      }

      setIsChecking(true);

      for (const contractCheck of route.contractChecks) {
        const client = contractCheck.chainId === route.sourceChainId ? sourceClient : destinationClient;

        if (!client) {
          if (!cancelled) {
            setReadiness({
              status: "not_deployed",
              reason: `RPC client unavailable for ${contractCheck.label}`,
            });
            setIsChecking(false);
          }
          return;
        }

        const bytecode = await client.getCode({ address: contractCheck.address as `0x${string}` });
        if (!bytecode || bytecode === "0x") {
          if (!cancelled) {
            setReadiness({
              status: "not_deployed",
              reason: `${contractCheck.label} is not deployed on the selected route`,
            });
            setIsChecking(false);
          }
          return;
        }
      }

      if (!cancelled) {
        setReadiness({ status: "ready", reason: "Bridge route is configured and deployed" });
        setIsChecking(false);
      }
    };

    checkReadiness().catch(error => {
      if (!cancelled) {
        setReadiness({
          status: "not_deployed",
          reason: error instanceof Error ? error.message : "Unable to verify route deployment",
        });
        setIsChecking(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [destinationClient, route, sourceClient, walletChainId]);

  return { route, readiness, isChecking };
};
