/**
 * This file contains external contract definitions (contracts not deployed by this project).
 * Add entries here to interact with pre-deployed contracts on any supported chain.
 */
import { GenericContractsDeclaration } from "~~/utils/scaffold-eth/contract";

const externalContracts = {
  296: {
    MemejobDCAVault: {
      address: "0xCB8928041b56a6a845E7eF8dbF00404cA14E406d",
      abi: [
        {
          type: "constructor",
          inputs: [
            {
              name: "_memejob",
              type: "address",
              internalType: "address",
            },
            {
              name: "_owner",
              type: "address",
              internalType: "address",
            },
          ],
          stateMutability: "nonpayable",
        },
        {
          type: "receive",
          stateMutability: "payable",
        },
        {
          type: "function",
          name: "cancelNextSchedule",
          inputs: [],
          outputs: [],
          stateMutability: "nonpayable",
        },
        {
          type: "function",
          name: "configureDCA",
          inputs: [
            {
              name: "memeToken",
              type: "address",
              internalType: "address",
            },
            {
              name: "mode",
              type: "uint8",
              internalType: "enum MemejobDCAVault.DCAMode",
            },
            {
              name: "amountPerRun",
              type: "uint256",
              internalType: "uint256",
            },
            {
              name: "intervalSeconds",
              type: "uint256",
              internalType: "uint256",
            },
          ],
          outputs: [],
          stateMutability: "nonpayable",
        },
        {
          type: "function",
          name: "dcaConfig",
          inputs: [],
          outputs: [
            {
              name: "memeToken",
              type: "address",
              internalType: "address",
            },
            {
              name: "mode",
              type: "uint8",
              internalType: "enum MemejobDCAVault.DCAMode",
            },
            {
              name: "amountPerRun",
              type: "uint256",
              internalType: "uint256",
            },
            {
              name: "intervalSeconds",
              type: "uint256",
              internalType: "uint256",
            },
          ],
          stateMutability: "view",
        },
        {
          type: "function",
          name: "deposit",
          inputs: [],
          outputs: [],
          stateMutability: "payable",
        },
        {
          type: "function",
          name: "depositTokens",
          inputs: [
            {
              name: "token",
              type: "address",
              internalType: "address",
            },
            {
              name: "amount",
              type: "uint256",
              internalType: "uint256",
            },
          ],
          outputs: [],
          stateMutability: "nonpayable",
        },
        {
          type: "function",
          name: "getBuyCost",
          inputs: [
            {
              name: "amount",
              type: "uint256",
              internalType: "uint256",
            },
          ],
          outputs: [
            {
              name: "",
              type: "uint256",
              internalType: "uint256",
            },
          ],
          stateMutability: "view",
        },
        {
          type: "function",
          name: "getSellReturn",
          inputs: [
            {
              name: "amount",
              type: "uint256",
              internalType: "uint256",
            },
          ],
          outputs: [
            {
              name: "",
              type: "uint256",
              internalType: "uint256",
            },
          ],
          stateMutability: "view",
        },
        {
          type: "function",
          name: "memejob",
          inputs: [],
          outputs: [
            {
              name: "",
              type: "address",
              internalType: "contract IMemeJob",
            },
          ],
          stateMutability: "view",
        },
        {
          type: "function",
          name: "nextSchedule",
          inputs: [],
          outputs: [
            {
              name: "",
              type: "address",
              internalType: "address",
            },
          ],
          stateMutability: "view",
        },
        {
          type: "function",
          name: "owner",
          inputs: [],
          outputs: [
            {
              name: "",
              type: "address",
              internalType: "address",
            },
          ],
          stateMutability: "view",
        },
        {
          type: "function",
          name: "renounceOwnership",
          inputs: [],
          outputs: [],
          stateMutability: "nonpayable",
        },
        {
          type: "function",
          name: "runDCA",
          inputs: [
            {
              name: "maxHbarIn",
              type: "uint256",
              internalType: "uint256",
            },
          ],
          outputs: [],
          stateMutability: "nonpayable",
        },
        {
          type: "function",
          name: "scheduleNextRun",
          inputs: [
            {
              name: "maxHbarIn",
              type: "uint256",
              internalType: "uint256",
            },
          ],
          outputs: [],
          stateMutability: "nonpayable",
        },
        {
          type: "function",
          name: "transferOwnership",
          inputs: [
            {
              name: "newOwner",
              type: "address",
              internalType: "address",
            },
          ],
          outputs: [],
          stateMutability: "nonpayable",
        },
        {
          type: "function",
          name: "withdraw",
          inputs: [
            {
              name: "amount",
              type: "uint256",
              internalType: "uint256",
            },
          ],
          outputs: [],
          stateMutability: "nonpayable",
        },
        {
          type: "function",
          name: "withdrawTokens",
          inputs: [
            {
              name: "token",
              type: "address",
              internalType: "address",
            },
            {
              name: "amount",
              type: "uint256",
              internalType: "uint256",
            },
          ],
          outputs: [],
          stateMutability: "nonpayable",
        },
        {
          type: "event",
          name: "BuyExecuted",
          inputs: [
            {
              name: "memeToken",
              type: "address",
              indexed: true,
              internalType: "address",
            },
            {
              name: "tokenAmount",
              type: "uint256",
              indexed: false,
              internalType: "uint256",
            },
            {
              name: "hbarSpent",
              type: "uint256",
              indexed: false,
              internalType: "uint256",
            },
          ],
          anonymous: false,
        },
        {
          type: "event",
          name: "DCAConfigured",
          inputs: [
            {
              name: "memeToken",
              type: "address",
              indexed: true,
              internalType: "address",
            },
            {
              name: "mode",
              type: "uint8",
              indexed: false,
              internalType: "enum MemejobDCAVault.DCAMode",
            },
            {
              name: "amountPerRun",
              type: "uint256",
              indexed: false,
              internalType: "uint256",
            },
            {
              name: "intervalSeconds",
              type: "uint256",
              indexed: false,
              internalType: "uint256",
            },
          ],
          anonymous: false,
        },
        {
          type: "event",
          name: "Deposited",
          inputs: [
            {
              name: "user",
              type: "address",
              indexed: true,
              internalType: "address",
            },
            {
              name: "amount",
              type: "uint256",
              indexed: false,
              internalType: "uint256",
            },
          ],
          anonymous: false,
        },
        {
          type: "event",
          name: "OwnershipTransferred",
          inputs: [
            {
              name: "previousOwner",
              type: "address",
              indexed: true,
              internalType: "address",
            },
            {
              name: "newOwner",
              type: "address",
              indexed: true,
              internalType: "address",
            },
          ],
          anonymous: false,
        },
        {
          type: "event",
          name: "ScheduleCreated",
          inputs: [
            {
              name: "schedule",
              type: "address",
              indexed: true,
              internalType: "address",
            },
            {
              name: "executeAt",
              type: "uint256",
              indexed: false,
              internalType: "uint256",
            },
          ],
          anonymous: false,
        },
        {
          type: "event",
          name: "ScheduleFailed",
          inputs: [
            {
              name: "responseCode",
              type: "int64",
              indexed: false,
              internalType: "int64",
            },
          ],
          anonymous: false,
        },
        {
          type: "event",
          name: "SellExecuted",
          inputs: [
            {
              name: "memeToken",
              type: "address",
              indexed: true,
              internalType: "address",
            },
            {
              name: "tokenAmount",
              type: "uint256",
              indexed: false,
              internalType: "uint256",
            },
            {
              name: "hbarReceived",
              type: "uint256",
              indexed: false,
              internalType: "uint256",
            },
          ],
          anonymous: false,
        },
        {
          type: "event",
          name: "TokensDeposited",
          inputs: [
            {
              name: "user",
              type: "address",
              indexed: true,
              internalType: "address",
            },
            {
              name: "token",
              type: "address",
              indexed: true,
              internalType: "address",
            },
            {
              name: "amount",
              type: "uint256",
              indexed: false,
              internalType: "uint256",
            },
          ],
          anonymous: false,
        },
        {
          type: "event",
          name: "TokensWithdrawn",
          inputs: [
            {
              name: "user",
              type: "address",
              indexed: true,
              internalType: "address",
            },
            {
              name: "token",
              type: "address",
              indexed: true,
              internalType: "address",
            },
            {
              name: "amount",
              type: "uint256",
              indexed: false,
              internalType: "uint256",
            },
          ],
          anonymous: false,
        },
        {
          type: "event",
          name: "Withdrawn",
          inputs: [
            {
              name: "user",
              type: "address",
              indexed: true,
              internalType: "address",
            },
            {
              name: "amount",
              type: "uint256",
              indexed: false,
              internalType: "uint256",
            },
          ],
          anonymous: false,
        },
        {
          type: "error",
          name: "MemejobDCAVault__InsufficientBalance",
          inputs: [],
        },
        {
          type: "error",
          name: "MemejobDCAVault__InvalidConfig",
          inputs: [],
        },
        {
          type: "error",
          name: "MemejobDCAVault__NoScheduleCapacity",
          inputs: [],
        },
        {
          type: "error",
          name: "MemejobDCAVault__ScheduleFailed",
          inputs: [],
        },
        {
          type: "error",
          name: "MemejobDCAVault__SlippageExceeded",
          inputs: [],
        },
        {
          type: "error",
          name: "MemejobDCAVault__TokenNotConfigured",
          inputs: [],
        },
        {
          type: "error",
          name: "MemejobDCAVault__TransferFailed",
          inputs: [],
        },
        {
          type: "error",
          name: "MemejobDCAVault__ZeroAmount",
          inputs: [],
        },
        {
          type: "error",
          name: "OwnableInvalidOwner",
          inputs: [
            {
              name: "owner",
              type: "address",
              internalType: "address",
            },
          ],
        },
        {
          type: "error",
          name: "OwnableUnauthorizedAccount",
          inputs: [
            {
              name: "account",
              type: "address",
              internalType: "address",
            },
          ],
        },
        {
          type: "error",
          name: "ReentrancyGuardReentrantCall",
          inputs: [],
        },
      ],
    },
  },
} as const;

export default externalContracts satisfies GenericContractsDeclaration;
