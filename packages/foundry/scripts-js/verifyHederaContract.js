/**
 * verifyHederaContract.js
 *
 * Verifies a single contract deployed on Hedera by calling Hashscan's legacy
 * Sourcify v1 API directly (POST /verify with multipart/form-data containing
 * metadata.json + source files).
 *
 * Uses only Node.js built-ins — no extra dependencies required.
 *
 * Usage:
 *   node scripts-js/verifyHederaContract.js <ContractName> [testnet|mainnet] [0xAddress]
 *   Network defaults to testnet. If you pass a contract address, broadcast is not used
 *
 * Example:
 *   node scripts-js/verifyHederaContract.js HederaToken
 *   node scripts-js/verifyHederaContract.js HederaToken mainnet
 *   node scripts-js/verifyHederaContract.js Vault testnet 0xabc...
 *   node scripts-js/verifyHederaContract.js Vault 0xabc... mainnet
 *   yarn verify:contract HederaToken testnet
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import https from "https";

const __dirname = dirname(fileURLToPath(import.meta.url));
const foundryRoot = join(__dirname, "..");

const HASHSCAN_VERIFY_HOST = "server-verify.hashscan.io";
const HASHSCAN_VERIFY_PATH = "/verify";

const NETWORK_TO_CHAIN_ID = {
  testnet: 296,
  mainnet: 295,
};

function isEvmAddress(s) {
  return (
    typeof s === "string" && s.startsWith("0x") && /^0x[a-fA-F0-9]{40}$/.test(s)
  );
}

/**
 * Resolves network + optional address from argv after contract name.
 * Accepts [network] [address] or [address] [network]; address skips broadcast lookup.
 */
function parseVerifyArgs(argvSlice) {
  const tokens = argvSlice.filter(Boolean);
  let networkArg = "testnet";
  let addressOverride = null;

  for (const t of tokens) {
    const lower = t.toLowerCase();
    if (NETWORK_TO_CHAIN_ID[lower]) {
      networkArg = lower;
    } else if (isEvmAddress(t)) {
      addressOverride = t;
    } else {
      throw new Error(
        `Unrecognized argument '${t}'. Use testnet|mainnet and/or 0x-prefixed 20-byte address.`,
      );
    }
  }

  return { networkArg, addressOverride };
}

// ─── multipart builder (no external deps) ────────────────────────────────────

function buildMultipart(boundary, fields) {
  const CRLF = "\r\n";
  const parts = [];

  for (const { name, filename, contentType, value } of fields) {
    const content =
      typeof value === "string" ? Buffer.from(value, "utf8") : value;
    let header = `--${boundary}${CRLF}`;
    if (filename) {
      header += `Content-Disposition: form-data; name="${name}"; filename="${filename}"${CRLF}`;
      header += `Content-Type: ${
        contentType || "application/octet-stream"
      }${CRLF}`;
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

// ─── helpers ─────────────────────────────────────────────────────────────────

function loadBroadcast(chainId) {
  const broadcastPath = join(
    foundryRoot,
    "broadcast",
    "Deploy.s.sol",
    String(chainId),
    "run-latest.json",
  );
  if (!existsSync(broadcastPath)) {
    throw new Error(
      `Broadcast file not found: ${broadcastPath}\nDeploy to chain ${chainId} first.`,
    );
  }
  return JSON.parse(readFileSync(broadcastPath, "utf8"));
}

function loadArtifact(contractName) {
  const artifactPath = join(
    foundryRoot,
    "out",
    `${contractName}.sol`,
    `${contractName}.json`,
  );
  if (!existsSync(artifactPath)) {
    throw new Error(
      `Artifact not found: ${artifactPath}\nRun 'forge build' first.`,
    );
  }
  return JSON.parse(readFileSync(artifactPath, "utf8"));
}

function readSourceFile(sourcePath) {
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
  console.log(
    `\nVerifying ${contractName} at ${contractAddress} on chain ${chainId}...`,
  );

  const artifact = loadArtifact(contractName);
  const rawMetadata = artifact.rawMetadata;
  if (!rawMetadata) {
    throw new Error(
      `No rawMetadata in artifact for ${contractName}. Run 'forge build' first.`,
    );
  }

  const metadata = JSON.parse(rawMetadata);
  const sources = metadata.sources || {};

  const fields = [
    { name: "address", value: contractAddress },
    { name: "chain", value: String(chainId) },
    {
      name: "files",
      filename: "metadata.json",
      contentType: "application/json",
      value: rawMetadata,
    },
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
      console.warn(
        `  Warning: could not read source ${sourcePath}: ${err.message}`,
      );
    }
  }

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
  const hashscanUrl = `https://hashscan.io/${explorer}/contract/${contractAddress}`;

  if (
    status === 409 ||
    (parsed?.error && parsed.error.toLowerCase().includes("already verified"))
  ) {
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

  const errorMsg =
    parsed?.error || parsed?.message || responseBody.slice(0, 400);
  console.error(`  ✗ Verification failed (HTTP ${status}): ${errorMsg}`);
  return false;
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const contractName = process.argv[2];
  const extraArgs = process.argv.slice(3);

  if (!contractName) {
    console.error(
      "Usage: node scripts-js/verifyHederaContract.js <ContractName> [testnet|mainnet] [0xAddress]",
    );
    console.error(
      "  With 0xAddress: verify that instance; broadcast not required.",
    );
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

  console.log(
    `Hedera contract verification — ${networkArg} (chain ${chainId})`,
  );
  console.log(
    `Verifier: https://${HASHSCAN_VERIFY_HOST}${HASHSCAN_VERIFY_PATH}`,
  );

  let verifyName = contractName;
  let verifyAddress = addressOverride;

  if (!verifyAddress) {
    const broadcast = loadBroadcast(chainId);
    const creates = (broadcast.transactions || []).filter(
      (tx) => tx.transactionType === "CREATE",
    );

    const tx = creates.find((t) => t.contractName === contractName);
    if (!tx) {
      console.error(
        `Error: No CREATE transaction found for '${contractName}' in broadcast for ${networkArg} (chain ${chainId}).`,
      );
      console.error(
        `Available contracts: ${
          creates.map((t) => t.contractName).join(", ") || "none"
        }`,
      );
      console.error(
        "Hint: For contracts not in broadcast (e.g. created by a factory), pass the deployed address:",
      );
      console.error(
        `  node scripts-js/verifyHederaContract.js ${contractName} ${networkArg} 0xYourVaultAddress`,
      );
      process.exit(1);
    }
    verifyName = tx.contractName;
    verifyAddress = tx.contractAddress;
  } else {
    console.log(`Using provided address (broadcast skipped): ${verifyAddress}`);
  }

  try {
    const ok = await verifyContract(verifyName, verifyAddress, chainId);
    if (!ok) process.exit(1);
  } catch (err) {
    console.error(`Fatal: ${err.message}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
