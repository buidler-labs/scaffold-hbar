# Scaffold-HBAR Hedera Demo

This branch is a Hedera-native demo focused on the Next.js application only. It does not rely on local Solidity contract workspaces.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20.18.3
- [Yarn](https://yarnpkg.com/) (v1 or v2+)
- [Git](https://git-scm.com/)

## Quick Start

```bash
yarn install
yarn next:dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available Scripts

- `yarn next:dev` - run the Next.js app in development mode (`yarn next:start` runs the same workspace `dev` script)
- `yarn lint` - lint frontend code (delegates to `next:lint`)
- `yarn next:lint` - lint the Next.js workspace directly
- `yarn next:check-types` - run TypeScript checks
- `yarn next:build` - build production assets
- `yarn next:serve` - serve the production build
- `yarn format` - format frontend code
- `yarn next:vercel` / `yarn next:vercel:yolo` / `yarn next:vercel:login` - Vercel deploy and login helpers
- `yarn next:ipfs` - IPFS upload flow for the frontend build

## Project Layout

- `packages/nextjs` - Hedera-native frontend app

## Links

- [Hedera Documentation](https://docs.hedera.com/)
- [Hashscan](https://hashscan.io/)
- [create-scaffold-hbar](https://github.com/buidler-labs/create-scaffold-hbar)
