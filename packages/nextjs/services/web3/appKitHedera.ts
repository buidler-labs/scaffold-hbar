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
  if (_provider) return _provider;
  _provider = (await HederaProvider.init({ projectId, metadata })) as HederaProvider;
  return _provider;
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

export async function resetAppKitSession() {
  try {
    await _provider?.disconnect();
  } catch (error) {
    console.warn("Failed to disconnect Hedera provider during reset", error);
  } finally {
    _appKit = null;
    _provider = null;
  }
}
