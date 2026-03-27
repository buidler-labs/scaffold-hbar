/**
 * This file contains external contract definitions (contracts not deployed by this project).
 * The ScheduledVault ABI is needed for dynamic vault interactions (each user deploys their own vault).
 */
import { GenericContractsDeclaration } from "~~/utils/scaffold-eth/contract";

const externalContracts = {
  296: {
    ScheduledVault: {
      address: "",
      abi: [
        {
          type: "constructor",
          inputs: [
            { name: "_strategy", type: "address", internalType: "address" },
            { name: "_owner", type: "address", internalType: "address" },
          ],
          stateMutability: "nonpayable",
        },
        { type: "receive", stateMutability: "payable" },
        { type: "function", name: "cancelNextSchedule", inputs: [], outputs: [], stateMutability: "nonpayable" },
        {
          type: "function",
          name: "configure",
          inputs: [
            { name: "config", type: "bytes", internalType: "bytes" },
            { name: "interval", type: "uint256", internalType: "uint256" },
          ],
          outputs: [],
          stateMutability: "nonpayable",
        },
        {
          type: "function",
          name: "consecutiveFailures",
          inputs: [],
          outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
          stateMutability: "view",
        },
        { type: "function", name: "deposit", inputs: [], outputs: [], stateMutability: "payable" },
        {
          type: "function",
          name: "depositTokens",
          inputs: [
            { name: "token", type: "address", internalType: "address" },
            { name: "amount", type: "uint256", internalType: "uint256" },
          ],
          outputs: [],
          stateMutability: "nonpayable",
        },
        { type: "function", name: "executeScheduled", inputs: [], outputs: [], stateMutability: "nonpayable" },
        {
          type: "function",
          name: "intervalSeconds",
          inputs: [],
          outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
          stateMutability: "view",
        },
        {
          type: "function",
          name: "maxConsecutiveFailures",
          inputs: [],
          outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
          stateMutability: "view",
        },
        {
          type: "function",
          name: "nextSchedule",
          inputs: [],
          outputs: [{ name: "", type: "address", internalType: "address" }],
          stateMutability: "view",
        },
        {
          type: "function",
          name: "owner",
          inputs: [],
          outputs: [{ name: "", type: "address", internalType: "address" }],
          stateMutability: "view",
        },
        {
          type: "function",
          name: "previewExecution",
          inputs: [],
          outputs: [
            {
              name: "",
              type: "tuple[]",
              internalType: "struct IExecutionStrategy.Action[]",
              components: [
                { name: "target", type: "address", internalType: "address" },
                { name: "value", type: "uint256", internalType: "uint256" },
                { name: "data", type: "bytes", internalType: "bytes" },
              ],
            },
          ],
          stateMutability: "view",
        },
        { type: "function", name: "renounceOwnership", inputs: [], outputs: [], stateMutability: "nonpayable" },
        { type: "function", name: "scheduleNextRun", inputs: [], outputs: [], stateMutability: "nonpayable" },
        {
          type: "function",
          name: "setMaxConsecutiveFailures",
          inputs: [{ name: "max", type: "uint256", internalType: "uint256" }],
          outputs: [],
          stateMutability: "nonpayable",
        },
        {
          type: "function",
          name: "setStrategy",
          inputs: [{ name: "_strategy", type: "address", internalType: "address" }],
          outputs: [],
          stateMutability: "nonpayable",
        },
        {
          type: "function",
          name: "strategy",
          inputs: [],
          outputs: [{ name: "", type: "address", internalType: "contract IExecutionStrategy" }],
          stateMutability: "view",
        },
        {
          type: "function",
          name: "strategyConfig",
          inputs: [],
          outputs: [{ name: "", type: "bytes", internalType: "bytes" }],
          stateMutability: "view",
        },
        {
          type: "function",
          name: "transferOwnership",
          inputs: [{ name: "newOwner", type: "address", internalType: "address" }],
          outputs: [],
          stateMutability: "nonpayable",
        },
        {
          type: "function",
          name: "withdraw",
          inputs: [{ name: "amount", type: "uint256", internalType: "uint256" }],
          outputs: [],
          stateMutability: "nonpayable",
        },
        {
          type: "function",
          name: "withdrawTokens",
          inputs: [
            { name: "token", type: "address", internalType: "address" },
            { name: "amount", type: "uint256", internalType: "uint256" },
          ],
          outputs: [],
          stateMutability: "nonpayable",
        },
        {
          type: "event",
          name: "ActionFailed",
          inputs: [
            { name: "index", type: "uint256", indexed: false, internalType: "uint256" },
            { name: "target", type: "address", indexed: false, internalType: "address" },
            { name: "reason", type: "bytes", indexed: false, internalType: "bytes" },
          ],
          anonymous: false,
        },
        {
          type: "event",
          name: "Configured",
          inputs: [{ name: "intervalSeconds", type: "uint256", indexed: false, internalType: "uint256" }],
          anonymous: false,
        },
        {
          type: "event",
          name: "Deposited",
          inputs: [
            { name: "user", type: "address", indexed: true, internalType: "address" },
            { name: "amount", type: "uint256", indexed: false, internalType: "uint256" },
          ],
          anonymous: false,
        },
        { type: "event", name: "ExecutionSucceeded", inputs: [], anonymous: false },
        {
          type: "event",
          name: "MaxFailuresReached",
          inputs: [{ name: "failures", type: "uint256", indexed: false, internalType: "uint256" }],
          anonymous: false,
        },
        {
          type: "event",
          name: "OwnershipTransferred",
          inputs: [
            { name: "previousOwner", type: "address", indexed: true, internalType: "address" },
            { name: "newOwner", type: "address", indexed: true, internalType: "address" },
          ],
          anonymous: false,
        },
        {
          type: "event",
          name: "PlanFailed",
          inputs: [{ name: "reason", type: "bytes", indexed: false, internalType: "bytes" }],
          anonymous: false,
        },
        {
          type: "event",
          name: "ScheduleCreated",
          inputs: [
            { name: "schedule", type: "address", indexed: true, internalType: "address" },
            { name: "executeAt", type: "uint256", indexed: false, internalType: "uint256" },
          ],
          anonymous: false,
        },
        {
          type: "event",
          name: "ScheduleRescheduleFailed",
          inputs: [{ name: "responseCode", type: "int64", indexed: false, internalType: "int64" }],
          anonymous: false,
        },
        {
          type: "event",
          name: "StrategySet",
          inputs: [{ name: "strategy", type: "address", indexed: true, internalType: "address" }],
          anonymous: false,
        },
        {
          type: "event",
          name: "TokensDeposited",
          inputs: [
            { name: "user", type: "address", indexed: true, internalType: "address" },
            { name: "token", type: "address", indexed: true, internalType: "address" },
            { name: "amount", type: "uint256", indexed: false, internalType: "uint256" },
          ],
          anonymous: false,
        },
        {
          type: "event",
          name: "TokensWithdrawn",
          inputs: [
            { name: "user", type: "address", indexed: true, internalType: "address" },
            { name: "token", type: "address", indexed: true, internalType: "address" },
            { name: "amount", type: "uint256", indexed: false, internalType: "uint256" },
          ],
          anonymous: false,
        },
        {
          type: "event",
          name: "Withdrawn",
          inputs: [
            { name: "user", type: "address", indexed: true, internalType: "address" },
            { name: "amount", type: "uint256", indexed: false, internalType: "uint256" },
          ],
          anonymous: false,
        },
        {
          type: "error",
          name: "OwnableInvalidOwner",
          inputs: [{ name: "owner", type: "address", internalType: "address" }],
        },
        {
          type: "error",
          name: "OwnableUnauthorizedAccount",
          inputs: [{ name: "account", type: "address", internalType: "address" }],
        },
        { type: "error", name: "ReentrancyGuardReentrantCall", inputs: [] },
        { type: "error", name: "ScheduledVault__InsufficientBalance", inputs: [] },
        { type: "error", name: "ScheduledVault__InvalidAddress", inputs: [] },
        { type: "error", name: "ScheduledVault__InvalidConfig", inputs: [] },
        { type: "error", name: "ScheduledVault__NoScheduleCapacity", inputs: [] },
        { type: "error", name: "ScheduledVault__NotConfigured", inputs: [] },
        { type: "error", name: "ScheduledVault__ScheduleFailed", inputs: [] },
        { type: "error", name: "ScheduledVault__TransferFailed", inputs: [] },
        { type: "error", name: "ScheduledVault__ZeroAmount", inputs: [] },
      ],
    },
  },
} as const;

export default externalContracts satisfies GenericContractsDeclaration;
