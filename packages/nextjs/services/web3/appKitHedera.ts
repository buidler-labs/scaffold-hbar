import {
  HederaAdapter,
  HederaChainDefinition,
  HederaProvider,
  hederaNamespace,
} from "@hashgraph/hedera-wallet-connect";
import { createAppKit } from "@reown/appkit/react";
import type UniversalProvider from "@walletconnect/universal-provider";
import scaffoldConfig from "~~/scaffold.config";

const projectId = scaffoldConfig.walletConnectProjectId;

const metadata = {
  name: "scaffold-hbar",
  description: "scaffold-hbar dApp",
  url: typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
  icons: [],
};

export const nativeNetworks = [HederaChainDefinition.Native.Testnet, HederaChainDefinition.Native.Mainnet] as const;

const hederaNativeAdapter = new HederaAdapter({
  projectId,
  networks: [...nativeNetworks],
  namespace: hederaNamespace,
});

let _provider: HederaProvider | null = null;

export async function getHederaProvider(): Promise<HederaProvider> {
  if (_provider) {
    ensureProvidersInitialized(_provider);
    return _provider;
  }
  _provider = (await HederaProvider.init({ projectId, metadata })) as HederaProvider;
  ensureProvidersInitialized(_provider);
  return _provider;
}

/**
 * On page refresh the WalletConnect session is restored from cache by
 * `HederaProvider.init → initialize()`. However, because we call
 * `HederaProvider.init({ projectId, metadata })` without passing
 * `requiredNamespaces` or `optionalNamespaces`, `provider.namespaces` ends up
 * as an empty object `{}`. `initProviders()` then iterates over zero keys and
 * never creates `nativeProvider`, causing the error
 * "nativeProvider not initialized. Please call connect()".
 *
 * The session itself carries the approved namespace map, so we use it as the
 * source of truth to populate `provider.namespaces` before calling
 * `initProviders()` again.
 */
function ensureProvidersInitialized(provider: HederaProvider): void {
  const p = provider as unknown as {
    session?: { namespaces?: Record<string, unknown> };
    namespaces?: Record<string, unknown>;
    nativeProvider?: unknown;
    initProviders?: () => void;
  };

  if (!p.session?.namespaces) return;

  const sessionNamespaceKeys = Object.keys(p.session.namespaces);
  const currentNamespaceKeys = Object.keys(p.namespaces ?? {});

  // If initProviders already ran (nativeProvider is set) there is nothing to do.
  if (p.nativeProvider) return;

  // namespaces is empty but the session has namespace data — populate from session.
  if (sessionNamespaceKeys.length > 0 && currentNamespaceKeys.length === 0) {
    p.namespaces = { ...p.session.namespaces };
  }

  if (typeof p.initProviders === "function") {
    try {
      p.initProviders();
    } catch (err) {
      console.warn("ensureProvidersInitialized: initProviders() failed", err);
    }
  }
}

let _appKit: ReturnType<typeof createAppKit> | null = null;

export async function initAppKit() {
  if (_appKit) return _appKit;

  const universalProvider = await getHederaProvider();

  _appKit = createAppKit({
    adapters: [hederaNativeAdapter],
    universalProvider: universalProvider as unknown as UniversalProvider,
    projectId,
    metadata,
    networks: [...nativeNetworks],
    defaultNetwork: nativeNetworks[0],
  });

  return _appKit;
}

/**
 * Removes AppKit and WalletConnect persistence from the browser so a prior
 * session cannot resurrect after disconnect.
 */
export function clearWalletStorage(): void {
  if (typeof window === "undefined") return;

  const appKitPrefix = "@appkit/";
  const extraKeys = new Set(["WALLETCONNECT_DEEPLINK_CHOICE", "wc_storage_version"]);

  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (!key) continue;
    const lower = key.toLowerCase();
    const isWcLegacy =
      lower.includes("wc@") ||
      lower.includes("walletconnect") ||
      lower.includes("wc_") ||
      lower.includes("wallet_connect");
    if (key.startsWith(appKitPrefix) || extraKeys.has(key) || isWcLegacy) {
      localStorage.removeItem(key);
    }
  }

  try {
    const request = indexedDB.deleteDatabase("WALLET_CONNECT_V2_INDEXED_DB");
    request.onerror = () => {
      console.warn("Failed to clear WalletConnect IndexedDB");
    };
  } catch {
    // IndexedDB may not be available (SSR, private mode, etc.)
  }
}

/**
 * Tears down the AppKit singleton so the next `initAppKit()` call creates a
 * fresh one, but intentionally keeps the `HederaProvider` instance alive.
 *
 * Destroying the provider on disconnect is what causes the "Please call
 * connect() before request()" error: the new provider created during re-init
 * has no `session`, so `request()` throws even though AppKit considers the
 * user connected. Keeping the same provider lets the WalletConnect library
 * populate `provider.session` itself when the new session is approved.
 */
export async function resetAppKitSession() {
  _appKit = null;
  // Do NOT null out _provider here. The existing HederaProvider instance must
  // survive so that AppKit can call initProviders() on it when the user
  // reconnects, restoring provider.session before any request() call.
}
