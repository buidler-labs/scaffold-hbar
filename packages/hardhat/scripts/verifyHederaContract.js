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
 *   node scripts/verifyHederaContract.js <ContractName> [testnet|mainnet] [0xAddress]
 *   Network defaults to testnet. If you pass a contract address, the artifact's
 *   address is ignored.
 *
 * Example:
 *   node scripts/verifyHederaContract.js HederaToken
 *   node scripts/verifyHederaContract.js HederaToken mainnet
 *   node scripts/verifyHederaContract.js HederaToken testnet 0xabc...
 *   node scripts/verifyHederaContract.js HederaToken 0xabc... testnet
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

function isEvmAddress(s) {
  return typeof s === "string" && s.startsWith("0x") && /^0x[a-fA-F0-9]{40}$/.test(s);
}

/**
 * Resolves network + optional address from argv after contract name.
 * Accepts [network] [address] or [address] [network]; address skips using artifact.address.
 */
function parseVerifyArgs(argvSlice) {
  const tokens = argvSlice.filter(Boolean);
  let networkArg = "testnet";
  let addressOverride = null;

  for (const t of tokens) {
    const lower = t.toLowerCase();
    if (NETWORK_TO_CHAIN_ID[lower] !== undefined) {
      networkArg = lower;
    } else if (isEvmAddress(t)) {
      addressOverride = t;
    } else {
      throw new Error(`Unrecognized argument '${t}'. Use testnet|mainnet and/or 0x-prefixed 20-byte address.`);
    }
  }

  return { networkArg, addressOverride };
}

function metadataToJsonString(rawMetadata) {
  if (rawMetadata == null) return null;
  if (typeof rawMetadata === "string") return rawMetadata;
  return JSON.stringify(rawMetadata);
}

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
      res.on("end", () =>
        resolve({
          status: res.statusCode,
          body: Buffer.concat(chunks).toString("utf8"),
        }),
      );
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function verifyContract(contractName, artifact, chainId, verifyAddress) {
  const address = verifyAddress;
  if (!address) {
    console.warn(`  Skipping ${contractName}: no address`);
    return false;
  }

  const rawMetadata = metadataToJsonString(artifact.metadata);
  if (!rawMetadata) {
    console.error(`  ✗ ${contractName}: no metadata in artifact. Recompile and redeploy.`);
    return false;
  }

  let metadata;
  try {
    metadata = JSON.parse(rawMetadata);
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
  const extraArgs = process.argv.slice(3);

  if (!contractName) {
    console.error("Usage: node scripts/verifyHederaContract.js <ContractName> [testnet|mainnet] [0xAddress]");
    console.error("  With 0xAddress: verify that instance; artifact address field is ignored.");
    process.exit(1);
  }

  let networkArg;
  let addressOverride;
  try {
    ({ networkArg, addressOverride } = parseVerifyArgs(extraArgs));
  } catch (err) {
    console.error(`Error: ${err.message}`);
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
  const artifactAddr = artifact.address;

  let verifyAddress = addressOverride;
  if (!verifyAddress) {
    if (!artifactAddr) {
      console.error(`Error: No address in artifact and none provided on CLI.`);
      process.exit(1);
    }
    verifyAddress = artifactAddr;
  } else {
    console.log(`Using provided address (artifact address ignored): ${verifyAddress}`);
    if (artifactAddr && artifactAddr.toLowerCase() !== verifyAddress.toLowerCase()) {
      console.log(`  (artifact stored address: ${artifactAddr})`);
    }
  }

  try {
    const ok = await verifyContract(contractName, artifact, chainId, verifyAddress);
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
