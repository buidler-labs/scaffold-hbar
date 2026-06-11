import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const foundryRoot = join(__dirname, "..");
const repoRoot = join(foundryRoot, "..", "..");
const bridgeStateDir = join(foundryRoot, "deployments", "bridge");
const nextBridgeConfigDir = join(
  repoRoot,
  "packages",
  "nextjs",
  "services",
  "bridge",
  "config",
);

const CHAIN_IDS = {
  hedera: "296",
  sepolia: "11155111",
};

const DEFAULTS = {
  axelar: {
    interchainTokenService: "0xB5FB4BE02232B1bBA4dC8f81dc24C26980dE9e3C",
    gasValue: "100000000000000",
    nativeFee: "1000000000000000",
    hederaGasValue: "100000000",
    hederaNativeFee: "1000000000000000000",
    hederaGasLimit: "15000000",
  },
  ccip: {
    hederaRouter: "0x802C5F84eAD128Ff36fD6a3f8a418e339f467Ce4",
    sepoliaRouter: "0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59",
    hederaChainSelector: "222782988166878823",
    sepoliaChainSelector: "16015286601757825753",
  },
  layerzero: {
    relayCommand: "make layerzero-relay DIRECTION={direction} TX={txHash}",
    receiveGas: "80000",
    minAmountBps: "9000",
    relayReceiveGas: "500000",
    hederaGasLimit: "15000000",
    hedera: {
      endpointV2: "0xbD672D1562Dd32C23B563C989d8140122483631d",
      receiveUln302: "0xc0c34919A04d69415EF2637A3Db5D637a7126cd0",
      eid: 40285,
      remoteEid: 40161,
    },
    sepolia: {
      endpointV2: "0x6EDCE65403992e310A62460808c4b910D972f10f",
      receiveUln302: "0xdAf00F5eE2158dD58E0d3857851c432E34A3A851",
      eid: 40161,
      remoteEid: 40285,
    },
  },
};

const providerNames = ["axelar", "ccip", "layerzero"];

const statePath = (provider) => join(bridgeStateDir, `${provider}.json`);
const nextConfigPath = (provider) =>
  join(nextBridgeConfigDir, `${provider}.json`);

const readJson = (path, fallback = {}) => {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8"));
};

const writeJson = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  const tmpPath = `${path}.tmp`;
  writeFileSync(tmpPath, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(tmpPath, path);
};

const readState = (provider) =>
  readJson(statePath(provider), { provider, route: {}, chains: {} });

const writeState = (provider, state) => {
  writeJson(statePath(provider), {
    provider,
    route: state.route ?? {},
    chains: state.chains ?? {},
    updatedAt: new Date().toISOString(),
  });
};

const parseValuePairs = (pairs) =>
  Object.fromEntries(
    pairs.map((pair) => {
      const separatorIndex = pair.indexOf("=");
      if (separatorIndex === -1)
        throw new Error(`Expected key=value, received "${pair}"`);
      return [pair.slice(0, separatorIndex), pair.slice(separatorIndex + 1)];
    }),
  );

const readTextIfExists = (path) =>
  existsSync(path) ? readFileSync(path, "utf8").trim() : undefined;

const compactObject = (object) =>
  Object.fromEntries(
    Object.entries(object).filter(
      ([, value]) => value !== undefined && value !== "",
    ),
  );

const unitDecimals = {
  wei: 0,
  gwei: 9,
  ether: 18,
};

const decimalToBaseUnit = (amount, decimals) => {
  const [whole, fraction = ""] = amount.split(".");
  const extraFraction = fraction.slice(decimals);

  if (extraFraction && /[1-9]/.test(extraFraction)) {
    throw new Error(`Too many decimal places for ${amount}`);
  }

  const paddedFraction = fraction.slice(0, decimals).padEnd(decimals, "0");
  return (
    BigInt(whole) * 10n ** BigInt(decimals) +
    BigInt(paddedFraction || "0")
  ).toString();
};

const normalizeIntegerConfigValue = (value) => {
  if (value === undefined || value === "") return value;

  const raw = String(value).trim();
  const match = raw.match(/^([0-9]+(?:\.[0-9]+)?)(wei|gwei|ether)$/i);

  if (!match) return raw;

  return decimalToBaseUnit(match[1], unitDecimals[match[2].toLowerCase()]);
};

const record = (provider, scope, pairs) => {
  assertProvider(provider);
  if (!scope)
    throw new Error(
      "Missing record scope. Use a chain id, chain alias, or route.",
    );

  const state = readState(provider);
  const values = parseValuePairs(pairs);
  const normalizedScope = CHAIN_IDS[scope] ?? scope;

  if (normalizedScope === "route") {
    state.route = { ...(state.route ?? {}), ...values };
  } else {
    state.chains = {
      ...(state.chains ?? {}),
      [normalizedScope]: {
        ...((state.chains ?? {})[normalizedScope] ?? {}),
        ...values,
      },
    };
  }

  writeState(provider, state);
  console.log(`[bridge-config] recorded ${provider} ${scope}`);
};

const shellAssign = (name, value) => {
  if (value === undefined || value === "") return "";
  const escaped = String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("$", "\\$");
  return `export ${name}="${escaped}"`;
};

const printEnv = (provider) => {
  assertProvider(provider);
  const state = readState(provider);
  const hedera = state.chains?.[CHAIN_IDS.hedera] ?? {};
  const sepolia = state.chains?.[CHAIN_IDS.sepolia] ?? {};
  const route = state.route ?? {};

  const lines =
    provider === "axelar"
      ? [
          shellAssign("SEPOLIA_BRIDGE_TOKEN", sepolia.bridgeToken),
          shellAssign("SEPOLIA_TOKEN_MANAGER", sepolia.tokenManager),
          shellAssign("HEDERA_BRIDGE_TOKEN", hedera.bridgeToken),
          shellAssign("HEDERA_TOKEN_MANAGER", hedera.tokenManager),
          shellAssign("HEDERA_APPROVAL_SPENDER", hedera.approvalSpender),
          shellAssign("TOKEN_ID", route.tokenId),
          shellAssign("SALT", route.salt),
        ]
      : provider === "ccip"
      ? [
          shellAssign("CCIP_SEPOLIA_TOKEN", sepolia.token),
          shellAssign("CCIP_SEPOLIA_POOL", sepolia.pool),
          shellAssign("CCIP_HEDERA_TOKEN", hedera.token),
          shellAssign("CCIP_HEDERA_WRAPPER", hedera.wrapper),
          shellAssign("CCIP_HEDERA_POOL", hedera.pool),
          shellAssign("CCIP_HEDERA_HTS_TOKEN", hedera.htsToken),
        ]
      : [
          shellAssign("SEPOLIA_OFT", sepolia.oft),
          shellAssign("HEDERA_OFT", hedera.oft),
          shellAssign("HEDERA_HTS_TOKEN", hedera.htsToken),
          shellAssign("SEPOLIA_WORKERS_DVN", sepolia.workersDvn),
          shellAssign("SEPOLIA_WORKERS_EXECUTOR", sepolia.workersExecutor),
          shellAssign("HEDERA_WORKERS_DVN", hedera.workersDvn),
          shellAssign("HEDERA_WORKERS_EXECUTOR", hedera.workersExecutor),
        ];

  console.log(lines.filter(Boolean).join("\n"));
};

const syncAxelar = () => {
  const state = readState("axelar");
  const existing = readJson(nextConfigPath("axelar"), { chains: {} });
  const hedera = state.chains?.[CHAIN_IDS.hedera] ?? {};
  const sepolia = state.chains?.[CHAIN_IDS.sepolia] ?? {};
  const route = state.route ?? {};
  const tokenId =
    route.tokenId ??
    readTextIfExists(join(foundryRoot, "script", "axelar", ".tokenid"));

  const nextConfig = {
    tokenId: tokenId ?? existing.tokenId,
    interchainTokenService:
      route.interchainTokenService ??
      existing.interchainTokenService ??
      DEFAULTS.axelar.interchainTokenService,
    gasValue:
      normalizeIntegerConfigValue(route.gasValue ?? existing.gasValue) ??
      DEFAULTS.axelar.gasValue,
    nativeFee:
      normalizeIntegerConfigValue(route.nativeFee ?? existing.nativeFee) ??
      DEFAULTS.axelar.nativeFee,
    chains: {
      [CHAIN_IDS.hedera]: compactObject({
        axelarName: "hedera",
        bridgeToken:
          hedera.bridgeToken ??
          existing.chains?.[CHAIN_IDS.hedera]?.bridgeToken,
        tokenManager:
          hedera.tokenManager ??
          existing.chains?.[CHAIN_IDS.hedera]?.tokenManager,
        approvalSpender:
          hedera.approvalSpender ??
          existing.chains?.[CHAIN_IDS.hedera]?.approvalSpender,
        whbar: hedera.whbar ?? existing.chains?.[CHAIN_IDS.hedera]?.whbar,
        tokenCreationPrice: normalizeIntegerConfigValue(
          hedera.tokenCreationPrice ??
            existing.chains?.[CHAIN_IDS.hedera]?.tokenCreationPrice,
        ),
        gasValue:
          normalizeIntegerConfigValue(
            route.hederaGasValue ??
              existing.chains?.[CHAIN_IDS.hedera]?.gasValue,
          ) ?? DEFAULTS.axelar.hederaGasValue,
        nativeFee:
          normalizeIntegerConfigValue(
            route.hederaNativeFee ??
              existing.chains?.[CHAIN_IDS.hedera]?.nativeFee,
          ) ?? DEFAULTS.axelar.hederaNativeFee,
        gasLimit:
          normalizeIntegerConfigValue(
            hedera.gasLimit ?? existing.chains?.[CHAIN_IDS.hedera]?.gasLimit,
          ) ?? DEFAULTS.axelar.hederaGasLimit,
      }),
      [CHAIN_IDS.sepolia]: compactObject({
        axelarName: "ethereum-sepolia",
        bridgeToken:
          sepolia.bridgeToken ??
          existing.chains?.[CHAIN_IDS.sepolia]?.bridgeToken,
        tokenManager:
          sepolia.tokenManager ??
          existing.chains?.[CHAIN_IDS.sepolia]?.tokenManager,
      }),
    },
  };

  writeJson(nextConfigPath("axelar"), nextConfig);
  console.log(`[bridge-config] synced ${nextConfigPath("axelar")}`);
};

const syncCcip = () => {
  const state = readState("ccip");
  const existing = readJson(nextConfigPath("ccip"), { chains: {} });
  const hedera = state.chains?.[CHAIN_IDS.hedera] ?? {};
  const sepolia = state.chains?.[CHAIN_IDS.sepolia] ?? {};

  const nextConfig = {
    chains: {
      [CHAIN_IDS.hedera]: compactObject({
        token: hedera.token ?? existing.chains?.[CHAIN_IDS.hedera]?.token,
        pool: hedera.pool ?? existing.chains?.[CHAIN_IDS.hedera]?.pool,
        htsToken:
          hedera.htsToken ?? existing.chains?.[CHAIN_IDS.hedera]?.htsToken,
        router:
          existing.chains?.[CHAIN_IDS.hedera]?.router ??
          DEFAULTS.ccip.hederaRouter,
        chainSelector:
          existing.chains?.[CHAIN_IDS.hedera]?.chainSelector ??
          DEFAULTS.ccip.hederaChainSelector,
        remoteChainSelector:
          existing.chains?.[CHAIN_IDS.hedera]?.remoteChainSelector ??
          DEFAULTS.ccip.sepoliaChainSelector,
      }),
      [CHAIN_IDS.sepolia]: compactObject({
        token: sepolia.token ?? existing.chains?.[CHAIN_IDS.sepolia]?.token,
        pool: sepolia.pool ?? existing.chains?.[CHAIN_IDS.sepolia]?.pool,
        router:
          existing.chains?.[CHAIN_IDS.sepolia]?.router ??
          DEFAULTS.ccip.sepoliaRouter,
        chainSelector:
          existing.chains?.[CHAIN_IDS.sepolia]?.chainSelector ??
          DEFAULTS.ccip.sepoliaChainSelector,
        remoteChainSelector:
          existing.chains?.[CHAIN_IDS.sepolia]?.remoteChainSelector ??
          DEFAULTS.ccip.hederaChainSelector,
      }),
    },
  };

  writeJson(nextConfigPath("ccip"), nextConfig);
  console.log(`[bridge-config] synced ${nextConfigPath("ccip")}`);
};

const syncLayerZero = () => {
  const state = readState("layerzero");
  const existing = readJson(nextConfigPath("layerzero"), { chains: {} });
  const hedera = state.chains?.[CHAIN_IDS.hedera] ?? {};
  const sepolia = state.chains?.[CHAIN_IDS.sepolia] ?? {};

  const nextConfig = {
    relayCommand: existing.relayCommand ?? DEFAULTS.layerzero.relayCommand,
    receiveGas: existing.receiveGas ?? DEFAULTS.layerzero.receiveGas,
    minAmountBps: existing.minAmountBps ?? DEFAULTS.layerzero.minAmountBps,
    chains: {
      [CHAIN_IDS.hedera]: compactObject({
        oft: hedera.oft ?? existing.chains?.[CHAIN_IDS.hedera]?.oft,
        htsToken:
          hedera.htsToken ?? existing.chains?.[CHAIN_IDS.hedera]?.htsToken,
        endpointV2:
          existing.chains?.[CHAIN_IDS.hedera]?.endpointV2 ??
          DEFAULTS.layerzero.hedera.endpointV2,
        receiveUln302:
          existing.chains?.[CHAIN_IDS.hedera]?.receiveUln302 ??
          DEFAULTS.layerzero.hedera.receiveUln302,
        workersDvn:
          hedera.workersDvn ?? existing.chains?.[CHAIN_IDS.hedera]?.workersDvn,
        workersExecutor:
          hedera.workersExecutor ??
          existing.chains?.[CHAIN_IDS.hedera]?.workersExecutor,
        eid:
          existing.chains?.[CHAIN_IDS.hedera]?.eid ??
          DEFAULTS.layerzero.hedera.eid,
        remoteEid:
          existing.chains?.[CHAIN_IDS.hedera]?.remoteEid ??
          DEFAULTS.layerzero.hedera.remoteEid,
        gasLimit:
          hedera.gasLimit ??
          existing.chains?.[CHAIN_IDS.hedera]?.gasLimit ??
          DEFAULTS.layerzero.hederaGasLimit,
        relayReceiveGas:
          existing.chains?.[CHAIN_IDS.hedera]?.relayReceiveGas ??
          DEFAULTS.layerzero.relayReceiveGas,
      }),
      [CHAIN_IDS.sepolia]: compactObject({
        oft: sepolia.oft ?? existing.chains?.[CHAIN_IDS.sepolia]?.oft,
        endpointV2:
          existing.chains?.[CHAIN_IDS.sepolia]?.endpointV2 ??
          DEFAULTS.layerzero.sepolia.endpointV2,
        receiveUln302:
          existing.chains?.[CHAIN_IDS.sepolia]?.receiveUln302 ??
          DEFAULTS.layerzero.sepolia.receiveUln302,
        workersDvn:
          sepolia.workersDvn ??
          existing.chains?.[CHAIN_IDS.sepolia]?.workersDvn,
        workersExecutor:
          sepolia.workersExecutor ??
          existing.chains?.[CHAIN_IDS.sepolia]?.workersExecutor,
        eid:
          existing.chains?.[CHAIN_IDS.sepolia]?.eid ??
          DEFAULTS.layerzero.sepolia.eid,
        remoteEid:
          existing.chains?.[CHAIN_IDS.sepolia]?.remoteEid ??
          DEFAULTS.layerzero.sepolia.remoteEid,
        relayReceiveGas:
          existing.chains?.[CHAIN_IDS.sepolia]?.relayReceiveGas ??
          DEFAULTS.layerzero.relayReceiveGas,
      }),
    },
  };

  writeJson(nextConfigPath("layerzero"), nextConfig);
  console.log(`[bridge-config] synced ${nextConfigPath("layerzero")}`);
};

const sync = (provider) => {
  if (provider === "all") {
    providerNames.forEach(sync);
    return;
  }

  assertProvider(provider);
  if (provider === "axelar") syncAxelar();
  if (provider === "ccip") syncCcip();
  if (provider === "layerzero") syncLayerZero();
};

const assertProvider = (provider) => {
  if (!providerNames.includes(provider)) {
    throw new Error(
      `Unknown provider "${provider}". Use ${providerNames.join(", ")} or all.`,
    );
  }
};

const usage = () => {
  console.log(`Usage:
  node scripts-js/syncBridgeConfig.js record <provider> <route|chain> key=value [...]
  node scripts-js/syncBridgeConfig.js env <provider>
  node scripts-js/syncBridgeConfig.js sync <provider|all>

Examples:
  node scripts-js/syncBridgeConfig.js record axelar sepolia bridgeToken=0x...
  node scripts-js/syncBridgeConfig.js record axelar route tokenId=0x...
  node scripts-js/syncBridgeConfig.js sync all`);
};

try {
  const [command, provider, scope, ...pairs] = process.argv.slice(2);

  if (command === "record") {
    record(provider, scope, pairs);
  } else if (command === "env") {
    printEnv(provider);
  } else if (command === "sync") {
    sync(provider ?? "all");
  } else {
    usage();
    process.exit(command ? 1 : 0);
  }
} catch (error) {
  console.error(`[bridge-config] ${error.message}`);
  process.exit(1);
}
