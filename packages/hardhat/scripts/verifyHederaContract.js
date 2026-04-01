/**
 * verifyHederaContract.js
 *
 * Verifies a single contract deployed on Hedera by calling Hashscan's legacy
 * Sourcify v1 API. Reads the Hardhat deployment artifact from
 * deployments/<network>/<ContractName>.json.
 *
 * Uses only Node.js built-ins — no extra dependencies.
 *
 * Usage:
 *   node scripts/verifyHederaContract.js <ContractName> [testnet|mainnet]
 *   Network defaults to testnet.
 *
 * Example:
 *   node scripts/verifyHederaContract.js HederaToken
 *   node scripts/verifyHederaContract.js HederaToken mainnet
 *   yarn verify:contract HederaToken testnet
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import https from "https";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const hardhatRoot = join(__dirname, "..");

const HASHSCAN_VERIFY_HOST = "server-verify.hashscan.io";
const HASHSCAN_VERIFY_PATH = "/verify";

const NETWORK_TO_CHAIN_ID = {
  testnet: 296,
  mainnet: 295,
};

const NETWORK_TO_HARDHAT_NAME = {
  testnet: "hederaTestnet",
  mainnet: "hederaMainnet",
};

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

async function verifyContract(contractName, artifact, chainId) {
  const address = artifact.address;
  if (!address) {
    console.warn(`  Skipping ${contractName}: no address in artifact`);
    return false;
  }

  const rawMetadata = artifact.metadata;
  if (!rawMetadata) {
    console.error(`  ✗ ${contractName}: no metadata in artifact. Recompile and redeploy.`);
    return false;
  }

  let metadata;
  try {
    metadata = typeof rawMetadata === "string" ? JSON.parse(rawMetadata) : rawMetadata;
  } catch {
    console.error(`  ✗ ${contractName}: invalid metadata JSON`);
    return false;
  }

  const sources = metadata.sources || {};
  const fields = [
    { name: "address", value: address },
    { name: "chain", value: String(chainId) },
    { name: "files", filename: "metadata.json", contentType: "application/json", value: rawMetadata },
  ];

  let sourceCount = 0;
  for (const [sourcePath, entry] of Object.entries(sources)) {
    const content = entry && entry.content;
    if (content == null) {
      console.warn(`  Warning: no content for source ${sourcePath}`);
      continue;
    }
    fields.push({
      name: "files",
      filename: sourcePath,
      contentType: "text/plain",
      value: content,
    });
    sourceCount++;
  }

  console.log(`\nVerifying ${contractName} at ${address} on chain ${chainId}...`);
  console.log(`  Submitting metadata.json + ${sourceCount} source file(s)...`);

  const boundary = `----FormBoundary${Date.now().toString(16)}`;
  const body = buildMultipart(boundary, fields);
  const { status, body: responseBody } = await postMultipart(
    HASHSCAN_VERIFY_HOST,
    HASHSCAN_VERIFY_PATH,
    body,
    boundary,
  );

  let parsed;
  try {
    parsed = JSON.parse(responseBody);
  } catch {
    parsed = null;
  }

  const explorer = chainId === 295 ? "mainnet" : "testnet";
  const hashscanUrl = `https://hashscan.io/${explorer}/contract/${address}`;

  if (status === 409 || (parsed?.error && parsed.error.toLowerCase().includes("already verified"))) {
    console.log(`  ✓ Already verified: ${hashscanUrl}`);
    return true;
  }

  if (status === 200) {
    const result = parsed?.result?.[0];
    if (result?.status === "perfect" || result?.status === "partial") {
      console.log(`  ✓ Verified (${result.status} match): ${hashscanUrl}`);
      return true;
    }
    if (!parsed?.error) {
      console.log(`  ✓ HTTP 200: ${hashscanUrl}`);
      return true;
    }
  }

  const errorMsg = parsed?.error || parsed?.message || responseBody.slice(0, 400);
  console.error(`  ✗ Verification failed (HTTP ${status}): ${errorMsg}`);
  return false;
}

async function main() {
  const contractName = process.argv[2];
  const networkArg = (process.argv[3] || "testnet").toLowerCase();

  if (!contractName) {
    console.error("Usage: node scripts/verifyHederaContract.js <ContractName> [testnet|mainnet]");
    console.error("Example: node scripts/verifyHederaContract.js HederaToken testnet");
    process.exit(1);
  }

  if (!NETWORK_TO_CHAIN_ID[networkArg]) {
    console.error(`Error: network must be 'testnet' or 'mainnet', got '${networkArg}'`);
    process.exit(1);
  }

  const chainId = NETWORK_TO_CHAIN_ID[networkArg];
  const hardhatNetworkName = NETWORK_TO_HARDHAT_NAME[networkArg];

  console.log(`Hedera contract verification — ${networkArg} (chain ${chainId})`);
  console.log(`Verifier: https://${HASHSCAN_VERIFY_HOST}${HASHSCAN_VERIFY_PATH}`);

  const artifactPath = join(hardhatRoot, "deployments", hardhatNetworkName, `${contractName}.json`);
  if (!existsSync(artifactPath)) {
    console.error(
      `Error: Deployment artifact not found: ${artifactPath}\nDeploy '${contractName}' to '${hardhatNetworkName}' first.`,
    );
    process.exit(1);
  }

  const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));

  try {
    const ok = await verifyContract(contractName, artifact, chainId);
    if (!ok) process.exit(1);
  } catch (err) {
    console.error(`Fatal: ${err.message}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
