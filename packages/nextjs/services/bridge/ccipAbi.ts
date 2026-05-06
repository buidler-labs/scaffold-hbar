export const erc20BridgeAbi = [
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

export const ccipRouterAbi = [
  {
    type: "function",
    name: "getFee",
    stateMutability: "view",
    inputs: [
      { name: "destinationChainSelector", type: "uint64" },
      {
        name: "message",
        type: "tuple",
        components: [
          { name: "receiver", type: "bytes" },
          { name: "data", type: "bytes" },
          {
            name: "tokenAmounts",
            type: "tuple[]",
            components: [
              { name: "token", type: "address" },
              { name: "amount", type: "uint256" },
            ],
          },
          { name: "feeToken", type: "address" },
          { name: "extraArgs", type: "bytes" },
        ],
      },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "ccipSend",
    stateMutability: "payable",
    inputs: [
      { name: "destinationChainSelector", type: "uint64" },
      {
        name: "message",
        type: "tuple",
        components: [
          { name: "receiver", type: "bytes" },
          { name: "data", type: "bytes" },
          {
            name: "tokenAmounts",
            type: "tuple[]",
            components: [
              { name: "token", type: "address" },
              { name: "amount", type: "uint256" },
            ],
          },
          { name: "feeToken", type: "address" },
          { name: "extraArgs", type: "bytes" },
        ],
      },
    ],
    outputs: [{ type: "bytes32" }],
  },
] as const;
