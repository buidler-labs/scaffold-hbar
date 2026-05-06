export const axelarInterchainTokenServiceAbi = [
  {
    type: "function",
    name: "registeredTokenAddress",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "bytes32" }],
    outputs: [{ name: "tokenAddress", type: "address" }],
  },
  {
    type: "function",
    name: "interchainTransfer",
    stateMutability: "payable",
    inputs: [
      { name: "tokenId", type: "bytes32" },
      { name: "destinationChain", type: "string" },
      { name: "destinationAddress", type: "bytes" },
      { name: "amount", type: "uint256" },
      { name: "metadata", type: "bytes" },
      { name: "gasValue", type: "uint256" },
    ],
    outputs: [],
  },
] as const;
