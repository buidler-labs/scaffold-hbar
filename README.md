# Scaffold-HBAR Hedera Demo

This branch is a Hedera-native demo focused on the Next.js application only. It does not rely on local Solidity contract workspaces.

## Prerequisites

- [Node.js](https://nodejs.org/) v20.x LTS (recommended: 20.18.3 or higher). Node 22+ may work but is not officially tested.
- [Yarn](https://yarnpkg.com/) (v1 or v2+) — this template is Yarn-only
- [Git](https://git-scm.com/)

## Quick Start

```bash
yarn install
yarn next:dev
```

Open [http://localhost:3000](http://localhost:3000).

## Extend with hedera-harness

This template ships a co-versioned [hedera-harness](https://www.npmjs.com/package/hedera-harness) recipe under `.harness/`. After install, from a clean Git working tree on a normal branch (e.g. `main`):

```bash
yarn harness:extend
```

That runs `hedera-harness extend .harness/spec.yaml`, which:

1. Creates a `harness/extend-…` branch (or continues an existing matching session)
2. Asks an agent to implement the extension PRD without rebuilding the app
3. Checkpoints each attempt and validates against `.harness/validators/`
4. Leaves you on the harness branch with push/PR instructions — it does **not** push, open a PR, merge, or switch back to `main`

Tracked recipe files live under `.harness/` (spec, PRD, validators). Runtime state (`.harness/runs/`, `.harness/cache/`, `.harness/runtime/`) is gitignored.

Requires [Cursor `agent` CLI](https://cursor.com/) (or another command configured in `.harness/spec.yaml`) on your PATH.

## Available Scripts

- `yarn next:dev` - run the Next.js app in development mode (`yarn next:start` runs the same workspace `dev` script)
- `yarn lint` - lint frontend code (delegates to `next:lint`)
- `yarn next:lint` - lint the Next.js workspace directly
- `yarn next:check-types` - run TypeScript checks
- `yarn next:build` - build production assets
- `yarn next:serve` - serve the production build
- `yarn format` - format frontend code
- `yarn harness:extend` - extend this app in place with the co-versioned harness recipe
- `yarn next:vercel` / `yarn next:vercel:yolo` / `yarn next:vercel:login` - Vercel deploy and login helpers
- `yarn next:ipfs` - IPFS upload flow for the frontend build

## Project Layout

- `packages/nextjs` - Hedera-native frontend app
- `.harness/` - tracked harness recipe (`spec.yaml`, `prd.md`, `validators/`)

## Links

- [Hedera Documentation](https://docs.hedera.com/)
- [Hashscan](https://hashscan.io/)
- [create-scaffold-hbar](https://github.com/hedera-dev/create-scaffold-hbar)
- [hedera-harness](https://github.com/hedera-dev/hedera-harness)
