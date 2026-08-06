# Extend Blank Template: Getting Started page

## Goal

This recipe **extends the existing blank Scaffold-HBAR app** already present in this repository. Do **not** rebuild the template from scratch. Preserve the current Home, Debug Contracts, and Block Explorer flows.

Add a public, read-only **Getting Started** page that explains how to use this scaffold for newcomers.

## Who It Is For

- Developers exploring the blank starter who want an in-app guide to the monorepo
- Agents implementing a small, reviewable extension on top of a working scaffold

## Existing app (preserve)

Keep these routes and behaviors working:

| Route | Purpose |
|-------|---------|
| `/` | Home — scaffold landing and wallet status |
| `/debug` | Debug Contracts — interact with deployed contracts |
| `/blockexplorer` | Local block explorer |

Do not remove wallet connect, theme switching, or existing scaffold UI patterns.

## Extension to implement

### Getting Started page (`/getting-started`)

Add a Next.js App Router page at `packages/nextjs/app/getting-started/page.tsx` that:

1. Is readable **without** a connected wallet
2. Explains, in plain language:
   - How to install and run the frontend (`yarn install`, `yarn next:dev`)
   - That Hardhat/Foundry workspaces are optional contract tooling selected at scaffold time
   - Where to go next (Debug Contracts, Block Explorer)
3. Includes a visible heading containing the exact text `Getting Started with Scaffold-HBAR` (validators look for this string)
4. Includes short sections clearly labeled `Run the frontend` and `Work with contracts`

### Navigation

Add a **Getting Started** item to the existing header menu (`packages/nextjs/components/Header.tsx` `menuLinks`) pointing at `/getting-started`, consistent with Home / Debug Contracts / Block Explorer.

## Non-goals

- No new Solidity / Hardhat / Foundry contracts or deploy scripts
- Do not modify `packages/hardhat` or `packages/foundry`
- No requirement for live operator keys or `.env` to open `/getting-started` or build/lint the frontend
- No redesign of the whole app; keep Scaffold-HBAR / DaisyUI patterns
- Do not switch the package manager away from Yarn

## Deliverables

- `packages/nextjs/app/getting-started/page.tsx` with the heading and sections above
- Header link to `/getting-started`
- Frontend lint and production build still pass (`yarn next:lint`, `yarn next:build`)

## Acceptance (deterministic)

After the extension:

1. `packages/nextjs/app/getting-started/page.tsx` exists
2. That file contains `Getting Started with Scaffold-HBAR`, `Run the frontend`, and `Work with contracts`
3. `Header.tsx` menu links include `/getting-started`
4. `yarn next:lint` and `yarn next:build` succeed
