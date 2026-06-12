"use client";

import { useEffect, useRef, useState } from "react";
import type { NextPage } from "next";
import { Abi, AbiEvent, parseUnits } from "viem";
import { useAccount, useBlockNumber, usePublicClient, useWatchContractEvent } from "wagmi";
import deployedContracts from "~~/contracts/deployedContracts";
import { useScaffoldEventHistory, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-hbar";

const SEPOLIA_WETH = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";
const HEDERA_TESTNET_CHAIN_ID = 296;
const SEPOLIA_CHAIN_ID = 11155111;
// Scan the last N blocks for historical events (~5 h on Hedera, ~33 h on Sepolia at current block times)
const HISTORY_BLOCKS = 10_000n;

type DcaPlan = {
  owner: string;
  amountPerExecution: bigint;
  feeForSender: bigint;
  intervalSeconds: bigint;
  targetToken: string;
  minAmountOut: bigint;
  maxExecutions: bigint;
  executionCount: bigint;
  active: boolean;
  lastExecutionTime: bigint;
};

type SepoliaSwapEvent = {
  planId: bigint;
  amountIn: bigint;
  amountOut: bigint;
  tokenOut: string;
  blockNumber: bigint | null;
};

type HederaEventLog = {
  args: Record<string, unknown>;
  blockNumber: bigint | null;
};

// ─── CreatePlanForm ───────────────────────────────────────────────────────────

function CreatePlanForm({ onCreated }: { onCreated: () => void }) {
  const [amount, setAmount] = useState("1");
  const [feeHbar, setFeeHbar] = useState("1");
  const [intervalSec, setIntervalSec] = useState("3600");
  const [targetToken, setTargetToken] = useState(SEPOLIA_WETH);
  const [maxExec, setMaxExec] = useState("0");

  const { writeContractAsync, isPending } = useScaffoldWriteContract({ contractName: "DcaOrchestrator" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await writeContractAsync({
      functionName: "createPlan",
      args: [
        parseUnits(amount, 6),
        parseUnits(feeHbar, 8),
        BigInt(intervalSec),
        targetToken as `0x${string}`,
        0n,
        BigInt(maxExec),
      ],
    });
    onCreated();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="form-control">
          <span className="label-text font-medium">Amount per execution (USDC)</span>
          <input
            type="number"
            className="input input-bordered"
            min="0.000001"
            step="any"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            required
          />
        </label>
        <label className="form-control">
          <span className="label-text font-medium">Relay fee per execution (HBAR)</span>
          <input
            type="number"
            className="input input-bordered"
            min="0.00000001"
            step="any"
            value={feeHbar}
            onChange={e => setFeeHbar(e.target.value)}
            required
          />
        </label>
        <label className="form-control">
          <span className="label-text font-medium">Interval (seconds)</span>
          <input
            type="number"
            className="input input-bordered"
            min="60"
            value={intervalSec}
            onChange={e => setIntervalSec(e.target.value)}
            required
          />
        </label>
        <label className="form-control">
          <span className="label-text font-medium">Max executions (0 = unlimited)</span>
          <input
            type="number"
            className="input input-bordered"
            min="0"
            value={maxExec}
            onChange={e => setMaxExec(e.target.value)}
            required
          />
        </label>
      </div>
      <label className="form-control">
        <span className="label-text font-medium">Target token address (Sepolia)</span>
        <input
          type="text"
          className="input input-bordered font-mono text-sm"
          value={targetToken}
          onChange={e => setTargetToken(e.target.value)}
          placeholder="0x..."
          required
        />
        <span className="label-text-alt text-base-content/50">Default: Sepolia WETH</span>
      </label>
      <button type="submit" className="btn btn-primary" disabled={isPending}>
        {isPending ? <span className="loading loading-spinner loading-sm" /> : null}
        Create DCA Plan
      </button>
    </form>
  );
}

function normalizePlan(raw: unknown): DcaPlan | undefined {
  if (!raw) return undefined;
  if (Array.isArray(raw)) {
    const [
      owner,
      amountPerExecution,
      feeForSender,
      intervalSeconds,
      targetToken,
      minAmountOut,
      maxExecutions,
      executionCount,
      active,
      lastExecutionTime,
    ] = raw as unknown[];
    return {
      owner: owner as string,
      amountPerExecution: BigInt(amountPerExecution as string),
      feeForSender: BigInt(feeForSender as string),
      intervalSeconds: BigInt(intervalSeconds as string),
      targetToken: targetToken as string,
      minAmountOut: BigInt(minAmountOut as string),
      maxExecutions: BigInt(maxExecutions as string),
      executionCount: BigInt(executionCount as string),
      active: Boolean(active),
      lastExecutionTime: BigInt(lastExecutionTime as string),
    };
  }
  return raw as DcaPlan;
}

// ─── PlanRow ──────────────────────────────────────────────────────────────────

function PlanRow({ planId, onCancelled }: { planId: bigint; onCancelled: () => void }) {
  const { data: rawPlan } = useScaffoldReadContract({
    contractName: "DcaOrchestrator",
    functionName: "plans",
    args: [planId],
    chainId: HEDERA_TESTNET_CHAIN_ID,
  });

  const plan = normalizePlan(rawPlan);
  const { writeContractAsync, isPending } = useScaffoldWriteContract({ contractName: "DcaOrchestrator" });

  if (!plan) {
    return (
      <tr>
        <td className="font-mono">{planId.toString()}</td>
        <td colSpan={5} className="text-base-content/40 text-xs italic">
          loading…
        </td>
      </tr>
    );
  }

  const intervalLabel = plan.intervalSeconds >= 3600n ? `${plan.intervalSeconds / 3600n}h` : `${plan.intervalSeconds}s`;
  const execLabel =
    plan.maxExecutions === 0n ? `${plan.executionCount} / ∞` : `${plan.executionCount} / ${plan.maxExecutions}`;
  const isCompleted = !plan.active && plan.maxExecutions > 0n && plan.executionCount >= plan.maxExecutions;
  const statusBadge = plan.active ? (
    <span className="badge badge-success badge-sm">active</span>
  ) : isCompleted ? (
    <span className="badge badge-info badge-sm">completed</span>
  ) : (
    <span className="badge badge-ghost badge-sm">cancelled</span>
  );

  return (
    <tr>
      <td className="font-mono">{planId.toString()}</td>
      <td>{(Number(plan.amountPerExecution) / 1e6).toFixed(2)} USDC</td>
      <td>{intervalLabel}</td>
      <td>{execLabel}</td>
      <td>{statusBadge}</td>
      <td>
        {plan.active && (
          <button
            className="btn btn-error btn-xs"
            disabled={isPending}
            onClick={async () => {
              await writeContractAsync({ functionName: "cancelPlan", args: [planId] });
              onCancelled();
            }}
          >
            {isPending ? <span className="loading loading-spinner loading-xs" /> : "Cancel"}
          </button>
        )}
      </td>
    </tr>
  );
}

// ─── PlanList ─────────────────────────────────────────────────────────────────

function PlanList({ nextPlanId, onCancelled }: { nextPlanId: bigint; onCancelled: () => void }) {
  const planIds = Array.from({ length: Number(nextPlanId) }, (_, i) => BigInt(i));

  if (nextPlanId === 0n) {
    return <p className="text-base-content/50 text-sm">No plans created yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="table table-sm">
        <thead>
          <tr>
            <th>ID</th>
            <th>Amount</th>
            <th>Interval</th>
            <th>Executions</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {planIds.map(id => (
            <PlanRow key={id.toString()} planId={id} onCancelled={onCancelled} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── ExecutionLog ─────────────────────────────────────────────────────────────

function ExecutionLog() {
  // ── Hedera: stable fromBlock set once, then useScaffoldEventHistory with watch ──
  const [hederaFromBlock, setHederaFromBlock] = useState<bigint | null>(null);
  const { data: hederaBlock } = useBlockNumber({ chainId: HEDERA_TESTNET_CHAIN_ID });
  useEffect(() => {
    if (hederaFromBlock !== null || hederaBlock == null) return;
    setHederaFromBlock(hederaBlock > HISTORY_BLOCKS ? hederaBlock - HISTORY_BLOCKS : 0n);
  }, [hederaBlock, hederaFromBlock]);

  const { data: rawHederaEvents, isLoading: hederaLoading } = useScaffoldEventHistory({
    contractName: "DcaOrchestrator",
    eventName: "ExecutionTriggered",
    chainId: HEDERA_TESTNET_CHAIN_ID,
    fromBlock: hederaFromBlock ?? 0n,
    watch: true,
    enabled: hederaFromBlock !== null,
  });
  const hederaEvents = (rawHederaEvents ?? []) as HederaEventLog[];

  // ── Sepolia: getLogs for history + useWatchContractEvent for live ──────────
  const [sepoliaEvents, setSepoliaEvents] = useState<SepoliaSwapEvent[]>([]);
  const [sepoliaLoading, setSepoliaLoading] = useState(true);
  const sepoliaFetched = useRef(false);

  const { data: sepoliaBlock } = useBlockNumber({ chainId: SEPOLIA_CHAIN_ID });
  const sepoliaPublicClient = usePublicClient({ chainId: SEPOLIA_CHAIN_ID });
  const sepoliaExecutor = deployedContracts[SEPOLIA_CHAIN_ID]?.DcaExecutor;

  useEffect(() => {
    if (sepoliaFetched.current || !sepoliaPublicClient || sepoliaBlock == null || !sepoliaExecutor) return;
    sepoliaFetched.current = true;

    const fromBlock = sepoliaBlock > HISTORY_BLOCKS ? sepoliaBlock - HISTORY_BLOCKS : 0n;
    const swapEvent = sepoliaExecutor.abi.find(
      (x): x is Extract<typeof x, { type: "event" }> =>
        (x as { type: string }).type === "event" && (x as { name: string }).name === "SwapExecuted",
    ) as AbiEvent | undefined;
    if (!swapEvent) {
      setSepoliaLoading(false);
      return;
    }

    sepoliaPublicClient
      .getLogs({ address: sepoliaExecutor.address as `0x${string}`, event: swapEvent, fromBlock })
      .then(logs => {
        setSepoliaEvents(
          (
            logs as unknown as {
              args: { planId?: bigint; amountIn?: bigint; amountOut?: bigint; tokenOut?: string };
              blockNumber: bigint | null;
            }[]
          ).map(log => ({
            planId: log.args.planId ?? 0n,
            amountIn: log.args.amountIn ?? 0n,
            amountOut: log.args.amountOut ?? 0n,
            tokenOut: log.args.tokenOut ?? "",
            blockNumber: log.blockNumber,
          })),
        );
        setSepoliaLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch Sepolia SwapExecuted events:", err);
        setSepoliaLoading(false);
      });
    // intentionally exclude sepoliaPublicClient — it's stable after init
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sepoliaBlock, sepoliaExecutor?.address]);

  // Append live Sepolia events (deduplicated by blockNumber+planId)
  useWatchContractEvent({
    address: sepoliaExecutor?.address as `0x${string}` | undefined,
    abi: sepoliaExecutor?.abi as Abi,
    eventName: "SwapExecuted",
    chainId: SEPOLIA_CHAIN_ID,
    onLogs: logs => {
      const fresh = (
        logs as unknown as {
          args: { planId?: bigint; amountIn?: bigint; amountOut?: bigint; tokenOut?: string };
          blockNumber?: bigint;
        }[]
      ).map(log => ({
        planId: log.args.planId ?? 0n,
        amountIn: log.args.amountIn ?? 0n,
        amountOut: log.args.amountOut ?? 0n,
        tokenOut: log.args.tokenOut ?? "",
        blockNumber: log.blockNumber ?? null,
      }));
      setSepoliaEvents(prev => {
        const seen = new Set(prev.map(e => `${e.blockNumber}-${e.planId}`));
        return [...fresh.filter(e => !seen.has(`${e.blockNumber}-${e.planId}`)), ...prev];
      });
    },
  });

  // ── Render ─────────────────────────────────────────────────────────────────
  const isLoading = hederaFromBlock === null || hederaLoading || sepoliaLoading;
  const noEvents = !isLoading && hederaEvents.length === 0 && sepoliaEvents.length === 0;

  if (isLoading) return <p className="text-base-content/50 text-sm">Fetching execution history…</p>;

  if (noEvents) {
    return (
      <p className="text-base-content/50 text-sm">
        No executions found in the last {HISTORY_BLOCKS.toLocaleString()} blocks. New executions will appear here
        automatically.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {hederaEvents.length > 0 && (
        <div>
          <h4 className="font-semibold text-sm mb-2 text-base-content/70">Hedera — Execution Triggers</h4>
          <div className="overflow-x-auto">
            <table className="table table-xs">
              <thead>
                <tr>
                  <th>Block</th>
                  <th>Plan ID</th>
                  <th>Execution #</th>
                </tr>
              </thead>
              <tbody>
                {hederaEvents.map((e, i) => (
                  <tr key={i}>
                    <td className="font-mono">{e.blockNumber?.toString() ?? "—"}</td>
                    <td>{(e.args.planId as bigint | undefined)?.toString() ?? "—"}</td>
                    <td>{(e.args.executionCount as bigint | undefined)?.toString() ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {sepoliaEvents.length > 0 && (
        <div>
          <h4 className="font-semibold text-sm mb-2 text-base-content/70">Sepolia — Swap Executions</h4>
          <div className="overflow-x-auto">
            <table className="table table-xs">
              <thead>
                <tr>
                  <th>Block</th>
                  <th>Plan ID</th>
                  <th>Amount In</th>
                  <th>Amount Out</th>
                  <th>Token Out</th>
                </tr>
              </thead>
              <tbody>
                {sepoliaEvents.map((e, i) => (
                  <tr key={i}>
                    <td className="font-mono">{e.blockNumber?.toString() ?? "—"}</td>
                    <td>{e.planId.toString()}</td>
                    <td>{(Number(e.amountIn) / 1e6).toFixed(2)} USDC</td>
                    <td>{(Number(e.amountOut) / 1e18).toFixed(6)}</td>
                    <td className="font-mono text-xs">{e.tokenOut ? `${e.tokenOut.slice(0, 8)}…` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const DcaPage: NextPage = () => {
  const { isConnected } = useAccount();

  const { data: nextPlanId, refetch: refetchNextPlanId } = useScaffoldReadContract({
    contractName: "DcaOrchestrator",
    functionName: "nextPlanId",
    chainId: HEDERA_TESTNET_CHAIN_ID,
  }) as { data: bigint | undefined; refetch: () => void };

  const handlePlanChange = () => void refetchNextPlanId();

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto px-5 py-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">Cross-Chain DCA</h1>
        <p className="text-base-content/60 text-sm m-0">
          Dollar-cost averaging from Hedera → Sepolia via Axelar GMP. Plans are self-scheduled on-chain using the Hedera
          Schedule Service — no off-chain keepers required.
        </p>
      </div>

      <div className="card bg-base-100 shadow border border-base-300">
        <div className="card-body">
          <h2 className="card-title text-lg">Create Plan</h2>
          {isConnected ? (
            <CreatePlanForm onCreated={handlePlanChange} />
          ) : (
            <p className="text-base-content/50 text-sm">Connect your wallet on Hedera testnet to create a plan.</p>
          )}
        </div>
      </div>

      <div className="card bg-base-100 shadow border border-base-300">
        <div className="card-body">
          <h2 className="card-title text-lg">Active Plans</h2>
          <PlanList nextPlanId={nextPlanId ?? 0n} onCancelled={handlePlanChange} />
        </div>
      </div>

      <div className="card bg-base-100 shadow border border-base-300">
        <div className="card-body">
          <h2 className="card-title text-lg">Execution Log</h2>
          <p className="text-xs text-base-content/50 mt-0 mb-3">
            Events from Hedera (chain 296) and Sepolia (chain 11155111) — last {HISTORY_BLOCKS.toLocaleString()} blocks.
          </p>
          <ExecutionLog />
        </div>
      </div>
    </div>
  );
};

export default DcaPage;
