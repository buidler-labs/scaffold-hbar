/**
 * verifyHedera.js
 *
 * Verifies contracts deployed on Hedera (testnet chain 296, mainnet chain 295)
 * by calling Hashscan's legacy Sourcify v1 API directly (POST /verify with
 * multipart/form-data containing metadata.json + source files).
 *
 * Uses only Node.js built-ins — no extra dependencies required.
 *
 * Usage:
 *   node scripts-js/verifyHedera.js [chainId]
 *   chainId defaults to 296 (testnet). Pass 295 for mainnet.
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import https from "https";

const __dirname = dirname(fileURLToPath(import.meta.url));
const foundryRoot = join(__dirname, "..");

const HASHSCAN_VERIFY_HOST = "server-verify.hashscan.io";
const HASHSCAN_VERIFY_PATH = "/verify";

// ─── multipart builder (no external deps) ────────────────────────────────────

function buildMultipart(boundary, fields) {
  const CRLF = "\r\n";
  const parts = [];

  for (const { name, filename, contentType, value } of fields) {
    const content = typeof value === "string" ? Buffer.from(value, "utf8") : value;
    let header = `--${boundary}${CRLF}`;
    if (filename) {
      header += `Content-Disposition: form-data; name="${name}"; filename="${filename}"${CRLF}`;
      header += `Content-Type: ${contentType || "application/octet-stream"}${CRLF}`;
    } else {
      header += `Content-Disposition: form-data; name="${name}"${CRLF}`;
    }
    header += CRLF;
    parts.push(Buffer.from(header, "utf8"), content, Buffer.from(CRLF, "utf8"));
  }

  parts.push(Buffer.from(`--${boundary}--${CRLF}`, "utf8"));
  return Buffer.concat(parts);
}

function postMultipart(host, path, body, boundary) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: host,
      port: 443,
      path,
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": body.length,
      },
    };
    const req = https.request(options, res => {
      const chunks = [];
      res.on("data", chunk => chunks.push(chunk));
      res.on("end", () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString("utf8") }));
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function loadBroadcast(chainId) {
  const broadcastPath = join(foundryRoot, "broadcast", "Deploy.s.sol", String(chainId), "run-latest.json");
  if (!existsSync(broadcastPath)) {
    throw new Error(`Broadcast file not found: ${broadcastPath}\nDeploy to chain ${chainId} first.`);
  }
  return JSON.parse(readFileSync(broadcastPath, "utf8"));
}

function loadArtifact(contractName) {
  const artifactPath = join(foundryRoot, "out", `${contractName}.sol`, `${contractName}.json`);
  if (!existsSync(artifactPath)) {
    throw new Error(`Artifact not found: ${artifactPath}\nRun 'forge build' first.`);
  }
  return JSON.parse(readFileSync(artifactPath, "utf8"));
}

function readSourceFile(sourcePath) {
  // sourcePath comes from metadata.sources (e.g. "contracts/HtsTokenCreator.sol")
  const candidates = [
    join(foundryRoot, sourcePath),
    join(foundryRoot, "node_modules", sourcePath),
    join(foundryRoot, "lib", sourcePath),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return readFileSync(p, "utf8");
  }
  throw new Error(`Source file not found: ${sourcePath}`);
}

// ─── verify one contract ──────────────────────────────────────────────────────

async function verifyContract(contractName, contractAddress, chainId) {
  console.log(`\nVerifying ${contractName} at ${contractAddress} on chain ${chainId}...`);

  const artifact = loadArtifact(contractName);
  const rawMetadata = artifact.rawMetadata;
  if (!rawMetadata) {
    throw new Error(`No rawMetadata in artifact for ${contractName}. Run 'forge build' first.`);
  }

  const metadata = JSON.parse(rawMetadata);
  const sources = metadata.sources || {};

  // Build multipart fields
  const fields = [
    { name: "address", value: contractAddress },
    { name: "chain", value: String(chainId) },
    { name: "files", filename: "metadata.json", contentType: "application/json", value: rawMetadata },
  ];

  let sourceCount = 0;
  for (const [sourcePath] of Object.entries(sources)) {
    try {
      const content = readSourceFile(sourcePath);
      fields.push({
        name: "files",
        filename: sourcePath,
        contentType: "text/plain",
        value: content,
      });
      sourceCount++;
    } catch (err) {
      console.warn(`  Warning: could not read source ${sourcePath}: ${err.message}`);
    }
  }

  console.log(`  Submitting metadata.json + ${sourceCount} source file(s)...`);

  const boundary = `----FormBoundary${Date.now().toString(16)}`;
  const body = buildMultipart(boundary, fields);
  const { status, body: responseBody } = await postMultipart(HASHSCAN_VERIFY_HOST, HASHSCAN_VERIFY_PATH, body, boundary);

  let parsed;
  try {
    parsed = JSON.parse(responseBody);
  } catch {
    parsed = null;
  }

  const explorer = chainId === 295 ? "mainnet" : "testnet";
  const hashscanUrl = `https://hashscan.io/${explorer}/contract/${contractAddress}`;

  // Already verified
  if (status === 409 || (parsed?.error && parsed.error.toLowerCase().includes("already verified"))) {
    console.log(`  ✓ Already verified: ${hashscanUrl}`);
    return true;
  }

  // Perfect / partial match
  if (status === 200) {
    const result = parsed?.result?.[0];
    if (result?.status === "perfect" || result?.status === "partial") {
      console.log(`  ✓ Verified (${result.status} match): ${hashscanUrl}`);
      return true;
    }
    // Some Sourcify-compatible servers return 200 with a different shape
    if (!parsed?.error) {
      console.log(`  ✓ HTTP 200: ${hashscanUrl}`);
      return true;
    }
  }

  const errorMsg = parsed?.error || parsed?.message || responseBody.slice(0, 400);
  console.error(`  ✗ Verification failed (HTTP ${status}): ${errorMsg}`);
  return false;
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const chainId = parseInt(process.argv[2] || "296", 10);

  if (chainId !== 295 && chainId !== 296) {
    console.error(`Error: chainId must be 295 (mainnet) or 296 (testnet), got ${chainId}`);
    process.exit(1);
  }

  console.log(`Hedera contract verification — chain ${chainId}`);
  console.log(`Verifier: https://${HASHSCAN_VERIFY_HOST}${HASHSCAN_VERIFY_PATH}`);

  const broadcast = loadBroadcast(chainId);
  const creates = (broadcast.transactions || []).filter(tx => tx.transactionType === "CREATE");

  if (creates.length === 0) {
    console.log("No CREATE transactions found in broadcast. Nothing to verify.");
    return;
  }

  console.log(`Found ${creates.length} contract(s) to verify.`);

  let passed = 0;
  let failed = 0;

  for (const tx of creates) {
    const name = tx.contractName;
    const addr = tx.contractAddress;
    if (!name || !addr) {
      console.warn("Skipping transaction with missing contractName or contractAddress");
      continue;
    }
    try {
      const ok = await verifyContract(name, addr, chainId);
      if (ok) passed++;
      else failed++;
    } catch (err) {
      console.error(`  ✗ Error verifying ${name}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone: ${passed} verified, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
