/**
 * Proof Wall app configuration.
 * Set topicId and badgeTokenId after running admin setup (create topic / create token).
 */
export const proofWallConfig = {
  /** HCS topic ID for the Proof Wall (e.g. "0.0.12345") */
  topicId: process.env.NEXT_PUBLIC_PROOF_WALL_TOPIC_ID ?? "",
  /** HTS badge token ID for gamification (e.g. "0.0.12346") */
  badgeTokenId: process.env.NEXT_PUBLIC_PROOF_WALL_BADGE_TOKEN_ID ?? "",
  /** Mirror Node base URL (testnet) */
  mirrorNodeBaseUrl: process.env.HEDERA_MIRROR_TESTNET_URL ?? "https://testnet.mirrornode.hedera.com",
  /** HashScan base URL for links */
  hashScanBaseUrl: "https://hashscan.io/testnet",
} as const;
