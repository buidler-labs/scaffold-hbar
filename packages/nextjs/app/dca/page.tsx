"use client";

import { useState } from "react";
import type { NextPage } from "next";
import { Abi, parseUnits } from "viem";
import { useAccount, useWatchContractEvent } from "wagmi";
import deployedContracts from "~~/contracts/deployedContracts";
import {
  useScaffoldReadContract,
  useScaffoldWatchContractEvent,
  useScaffoldWriteContract,
} from "~~/hooks/scaffold-hbar";

const SEPOLIA_WETH = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";
const HEDERA_TESTNET_CHAIN_ID = 296;
const SEPOLIA_CHAIN_ID = 11155111;

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

type HederaTriggerEvent = {
  planId: bigint;
  executionCount: bigint;
  blockNumber?: bigint;
};

type SepoliaSwapEvent = {
  planId: bigint;
  amountIn: bigint;
  amountOut: bigint;
  tokenOut: string;
  blockNumber?: bigint;
};

function CreatePlanForm({ onCreated }: { onCreated: () => void }) {
  const [amount, setAmount] = useState("1");
  const [feeHbar, setFeeHbar] = useState("1");
  const [intervalSec, setIntervalSec] = useState("3600");
  const [targetToken, setTargetToken] = useState(SEPOLIA_WETH);
  const [maxExec, setMaxExec] = useState("0");

  const { writeContractAsync, isPending } = useScaffoldWriteContract({
    contractName: "DcaOrchestrator",
  });

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
            step="0.01"
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
            step="0.1"
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

function PlanRow({ planId, onCancelled }: { planId: bigint; onCancelled: () => void }) {
  const { data: plan } = useScaffoldReadContract({
    contractName: "DcaOrchestrator",
    functionName: "plans",
    args: [planId],
    chainId: HEDERA_TESTNET_CHAIN_ID,
  }) as { data: DcaPlan | undefined };

  const { writeContractAsync, isPending } = useScaffoldWriteContract({
    contractName: "DcaOrchestrator",
  });

  if (!plan || !plan.active) return null;

  const intervalLabel = plan.intervalSeconds >= 3600n ? `${plan.intervalSeconds / 3600n}h` : `${plan.intervalSeconds}s`;

  const execLabel =
    plan.maxExecutions === 0n ? `${plan.executionCount} / ∞` : `${plan.executionCount} / ${plan.maxExecutions}`;

  return (
    <tr>
      <td className="font-mono">{planId.toString()}</td>
      <td>{(Number(plan.amountPerExecution) / 1e6).toFixed(2)} USDC</td>
      <td>{intervalLabel}</td>
      <td>{execLabel}</td>
      <td>
        <span className="badge badge-success badge-sm">active</span>
      </td>
      <td>
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
      </td>
    </tr>
  );
}

function PlanList({ nextPlanId, refresh }: { nextPlanId: bigint; refresh: number }) {
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
            <PlanRow key={id.toString()} planId={id} onCancelled={() => void refresh} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExecutionLog() {
  const [hederaEvents, setHederaEvents] = useState<HederaTriggerEvent[]>([]);
  const [sepoliaEvents, setSepoliaEvents] = useState<SepoliaSwapEvent[]>([]);

  useScaffoldWatchContractEvent({
    contractName: "DcaOrchestrator",
    eventName: "ExecutionTriggered",
    onLogs: logs => {
      const parsed = logs.map(log => ({
        planId: (log.args as { planId?: bigint }).planId ?? 0n,
        executionCount: (log.args as { executionCount?: bigint }).executionCount ?? 0n,
        blockNumber: log.blockNumber ?? undefined,
      }));
      setHederaEvents(prev => [...parsed, ...prev]);
    },
  });

  const sepoliaExecutor = deployedContracts[SEPOLIA_CHAIN_ID]?.DcaExecutor;
  useWatchContractEvent({
    address: sepoliaExecutor?.address,
    abi: sepoliaExecutor?.abi as Abi,
    eventName: "SwapExecuted",
    chainId: SEPOLIA_CHAIN_ID,
    onLogs: logs => {
      const parsed = (
        logs as unknown as {
          args: { planId?: bigint; amountIn?: bigint; amountOut?: bigint; tokenOut?: string };
          blockNumber?: bigint;
        }[]
      ).map(log => ({
        planId: log.args.planId ?? 0n,
        amountIn: log.args.amountIn ?? 0n,
        amountOut: log.args.amountOut ?? 0n,
        tokenOut: log.args.tokenOut ?? "",
        blockNumber: log.blockNumber,
      }));
      setSepoliaEvents(prev => [...parsed, ...prev]);
    },
  });

  const noEvents = hederaEvents.length === 0 && sepoliaEvents.length === 0;

  if (noEvents) {
    return <p className="text-base-content/50 text-sm">Listening for new executions…</p>;
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
                    <td>{e.planId.toString()}</td>
                    <td>{e.executionCount.toString()}</td>
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

const DcaPage: NextPage = () => {
  const { isConnected } = useAccount();
  const [refresh, setRefresh] = useState(0);

  const { data: nextPlanId } = useScaffoldReadContract({
    contractName: "DcaOrchestrator",
    functionName: "nextPlanId",
    chainId: HEDERA_TESTNET_CHAIN_ID,
  }) as { data: bigint | undefined };

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
            <CreatePlanForm onCreated={() => setRefresh(r => r + 1)} />
          ) : (
            <p className="text-base-content/50 text-sm">Connect your wallet on Hedera testnet to create a plan.</p>
          )}
        </div>
      </div>

      <div className="card bg-base-100 shadow border border-base-300">
        <div className="card-body">
          <h2 className="card-title text-lg">Active Plans</h2>
          <PlanList nextPlanId={nextPlanId ?? 0n} refresh={refresh} />
        </div>
      </div>

      <div className="card bg-base-100 shadow border border-base-300">
        <div className="card-body">
          <h2 className="card-title text-lg">Execution Log</h2>
          <p className="text-xs text-base-content/50 mt-0 mb-3">
            Live events from Hedera (chain 296) and Sepolia (chain 11155111). Events received since page load.
          </p>
          <ExecutionLog />
        </div>
      </div>
    </div>
  );
};

export default DcaPage;
