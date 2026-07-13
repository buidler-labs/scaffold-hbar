"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppProgressBar as ProgressBar } from "next-nprogress-bar";
import { Toaster } from "react-hot-toast";
import { WagmiProvider } from "wagmi";
import { Footer } from "~~/components/Footer";
import { Header } from "~~/components/Header";
import { LocalChainErrorBanner } from "~~/components/LocalChainErrorBanner";
import { NativeTransactionSignerBridge } from "~~/services/web3/NativeTransactionSignerBridge";
import { HederaWalletConnectProvider } from "~~/services/web3/hederaWalletConnect";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";

const ScaffoldHbarApp = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <div className="flex flex-col min-h-screen">
        <Header />
        <LocalChainErrorBanner />
        <main className="relative flex flex-col flex-1">{children}</main>
        <Footer />
      </div>
      <Toaster />
    </>
  );
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

export const ScaffoldHbarAppWithProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <HederaWalletConnectProvider>
          <NativeTransactionSignerBridge>
            <ProgressBar height="3px" color="#2299dd" />
            <ScaffoldHbarApp>{children}</ScaffoldHbarApp>
          </NativeTransactionSignerBridge>
        </HederaWalletConnectProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
