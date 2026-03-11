import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  transpilePackages: ["@scaffold-ui/components", "@scaffold-ui/debug-contracts", "@scaffold-ui/hooks"],
  typescript: {
    ignoreBuildErrors: process.env.NEXT_PUBLIC_IGNORE_BUILD_ERROR === "true",
  },
  eslint: {
    ignoreDuringBuilds: process.env.NEXT_PUBLIC_IGNORE_BUILD_ERROR === "true",
  },
  // @rainbow-me/rainbowkit calls localStorage without SSR guards in v2.2.x;
  // marking it as a server external prevents it from being evaluated on the server.
  serverExternalPackages: ["@rainbow-me/rainbowkit"],
  webpack: (config, { dev }) => {
    // config.resolve.symlinks = false;
    config.resolve.fallback = { fs: false, net: false, tls: false };
    config.externals.push("pino-pretty", "lokijs", "encoding");

    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
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

const isIpfs = process.env.NEXT_PUBLIC_IPFS_BUILD === "true";

if (isIpfs) {
  nextConfig.output = "export";
  nextConfig.trailingSlash = true;
  nextConfig.images = {
    unoptimized: true,
  };
}

module.exports = nextConfig;
