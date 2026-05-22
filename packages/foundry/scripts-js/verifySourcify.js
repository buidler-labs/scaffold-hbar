#!/usr/bin/env node
/**
 * verifySourcify.js
 *
 * Wrapper script for forge verify-contract that adds HashScan URL output.
 * Hedera is now supported on the main Sourcify instance (sourcify.dev).
 *
 * Usage:
 *   node scripts-js/verifySourcify.js <chainId> <address> <contractPath>
 *
 * Example:
 *   node scripts-js/verifySourcify.js 296 0x123... contracts/MyContract.sol:MyContract
 */

import { spawnSync } from "child_process";

const args = process.argv.slice(2);

if (args.length < 3) {
  console.log(`
Usage: yarn verify:testnet <address> <contractPath>
       yarn verify:mainnet <address> <contractPath>

Example:
  yarn verify:testnet 0x5B614Bf80Cb3841F9553b019F81135Ec1A58Ff8F contracts/ScheduledVault.sol:ScheduledVault

The contract will be verified on Sourcify and visible on HashScan.
`);
  process.exit(1);
}

const [chainId, address, contractPath] = args;
const network = chainId === "295" ? "mainnet" : "testnet";

console.log(`\nVerifying ${contractPath} at ${address} on Hedera ${network}...`);
console.log(`Chain ID: ${chainId}`);
console.log(`Verifier: Sourcify (sourcify.dev)\n`);

const result = spawnSync(
  "forge",
  [
    "verify-contract",
    address,
    contractPath,
    "--chain-id",
    chainId,
    "--verifier",
    "sourcify",
  ],
  {
    stdio: "inherit",
    shell: true,
  }
);

if (result.status === 0) {
  console.log(`\n✓ Verification successful!`);
  console.log(`\nSourcify: https://repo.sourcify.dev/contracts/full_match/${chainId}/${address}/`);
  console.log(`HashScan: https://hashscan.io/${network}/contract/${address}`);
}

process.exit(result.status);
