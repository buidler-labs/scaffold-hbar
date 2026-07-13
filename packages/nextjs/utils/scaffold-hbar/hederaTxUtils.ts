/**
 * Base64 encoding for transactions passed to `hedera_signAndExecuteTransaction`.
 * Use the package entry point only — avoids deep imports under dist/ that can break on upgrades.
 */
export { transactionToBase64String } from "@hashgraph/hedera-wallet-connect";
