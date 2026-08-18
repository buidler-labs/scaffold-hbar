import type { NextConfig } from "next";
import { createRequire } from "node:module";
import path from "path";

const nodeRequire = createRequire(import.meta.url);
const { ProvidePlugin } = nodeRequire("webpack") as {
  ProvidePlugin: new (definitions: Record<string, string[]>) => unknown;
};

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../.."),
  reactStrictMode: true,
  devIndicators: false,
  transpilePackages: ["@hashgraph/hedera-wallet-connect", "@scaffold-hbar-ui/components"],
  typescript: {
    ignoreBuildErrors: process.env.NEXT_PUBLIC_IGNORE_BUILD_ERROR === "true",
  },
  eslint: {
    ignoreDuringBuilds: process.env.NEXT_PUBLIC_IGNORE_BUILD_ERROR === "true",
  },
  webpack: (config, { dev, isServer }) => {
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      porto: false,
      "porto/internal": false,
      "@metamask/connect-evm": path.join(__dirname, "stubs/metamask-connect-evm.js"),
    };

    config.resolve.fallback = {
      ...(config.resolve.fallback ?? {}),
      fs: false,
      net: false,
      tls: false,
      crypto: nodeRequire.resolve("crypto-browserify"),
      stream: nodeRequire.resolve("stream-browserify"),
      buffer: nodeRequire.resolve("buffer"),
      util: nodeRequire.resolve("util"),
      assert: nodeRequire.resolve("assert"),
      process: nodeRequire.resolve("process/browser"),
    };

    config.plugins.push(
      new ProvidePlugin({
        Buffer: ["buffer", "Buffer"],
        process: ["process"],
      }),
    );

    config.externals.push("pino-pretty", "lokijs", "encoding");
    if (isServer) {
      config.externals.push("@walletconnect/modal");
    }

    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      // viem re-exports Tempo chain defs; ox uses dynamic require() internally.
      {
        module: /node_modules\/(ox|viem)\/_esm\/tempo/,
        message: /Critical dependency/,
      },
      {
        module: /node_modules\/@reown\/appkit\/node_modules\/ox/,
        message: /Critical dependency/,
      },
    ];

    if (dev) {
      config.watchOptions = {
        followSymlinks: true,
      };
      config.snapshot = {
        ...config.snapshot,
        managedPaths: [],
      };
    }
    return config;
  },
};

export default nextConfig;
