/**
 * verifyHedera.js
 *
 * Verifies contracts deployed on Hedera (testnet 296, mainnet 295) by calling
 * Hashscan's legacy Sourcify v1 API. Reads Hardhat deployment artifacts from
 * deployments/<network>/ which already embed full source content in metadata.
 *
 * Uses only Node.js built-ins — no extra dependencies.
 *
 * Usage:
 *   node scripts/verifyHedera.js [chainId]
 *   chainId defaults to 296 (testnet). Pass 295 for mainnet.
 */

const { readFileSync, readdirSync, existsSync } = require("fs");
const { join, dirname } = require("path");
const https = require("https");

const hardhatRoot = join(dirname(__filename), "..");

const HASHSCAN_VERIFY_HOST = "server-verify.hashscan.io";
const HASHSCAN_VERIFY_PATH = "/verify";

const CHAIN_ID_TO_NETWORK = {
  296: "hederaTestnet",
  295: "hederaMainnet",
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
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () =>
        resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString("utf8") })
      );
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function getDeploymentArtifacts(networkName) {
  const deploymentsDir = join(hardhatRoot, "deployments", networkName);
  if (!existsSync(deploymentsDir)) {
    throw new Error(
      `Deployments directory not found: ${deploymentsDir}\nDeploy to network '${networkName}' first.`
    );
  }

  const names = readdirSync(deploymentsDir, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith(".json"))
    .map((d) => d.name.replace(/\.json$/, ""));

  return names.map((name) => {
    const path = join(deploymentsDir, `${name}.json`);
    const raw = readFileSync(path, "utf8");
    const artifact = JSON.parse(raw);
    return { contractName: name, artifact };
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
  } catch (e) {
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
    boundary
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
  const chainId = parseInt(process.argv[2] || "296", 10);
  const networkName = CHAIN_ID_TO_NETWORK[chainId];

  if (networkName == null) {
    console.error(`Error: chainId must be 295 (mainnet) or 296 (testnet), got ${chainId}`);
    process.exit(1);
  }

  console.log(`Hedera contract verification — chain ${chainId} (${networkName})`);
  console.log(`Verifier: https://${HASHSCAN_VERIFY_HOST}${HASHSCAN_VERIFY_PATH}`);

  const artifacts = getDeploymentArtifacts(networkName);
  if (artifacts.length === 0) {
    console.log("No deployment artifacts found. Deploy first.");
    return;
  }

  console.log(`Found ${artifacts.length} contract(s) to verify.`);

  let passed = 0;
  let failed = 0;

  for (const { contractName, artifact } of artifacts) {
    try {
      const ok = await verifyContract(contractName, artifact, chainId);
      if (ok) passed++;
      else failed++;
    } catch (err) {
      console.error(`  ✗ Error verifying ${contractName}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone: ${passed} verified, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
