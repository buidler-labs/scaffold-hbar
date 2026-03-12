---
name: Hedera Phase 1 Adaptation
overview: Adapt scaffold-eth-2 (Hardhat flavor) to work on Hedera testnet/mainnet using standard EVM compatibility -- reconfigure networks, RPCs, block explorer, faucet, branding, contract verification, and create a Foundry template. No local chain support (no Hardhat local, no Hiero). Development targets Hedera testnet directly.
todos:
  - id: scaffold-config
    content: "Update scaffold.config.ts: target hederaTestnet, add Hashio RPC overrides, remove alchemyApiKey"
    status: completed
  - id: wagmi-config
    content: "Update wagmiConfig.tsx: remove Alchemy fallback, remove hardhat references, simplify transport"
    status: completed
  - id: networks-metadata
    content: "Update networks.ts: remove RPC_CHAIN_NAMES/getAlchemyHttpUrl, add Hedera metadata, fix HashScan address path (/account/ not /address/)"
    status: completed
  - id: faucet-cleanup
    content: Remove local faucet (FaucetButton/Faucet), replace with Hedera Portal Faucet link for testnet
    status: completed
  - id: wallet-connectors
    content: "Update wagmiConnectors.tsx: remove baseAccount, remove burner wallet, remove hardhat refs, update appName"
    status: completed
  - id: branding
    content: Update page.tsx, Footer, layout.tsx, getMetadata.ts with Hedera branding, logos, links
    status: completed
  - id: agent-configs
    content: Update AGENTS.md and .cursor/ configs for Hedera context
    status: completed
  - id: hardhat-config
    content: Add Hedera networks to hardhat.config.ts, set defaultNetwork to hederaTestnet, install hashscan-verify
    status: completed
  - id: deploy-scripts
    content: Verify deploy script for Hedera, remove autoMine, update comments
    status: completed
  - id: scripts-ecdsa
    content: Verify hardhat scripts are ECDSA-compatible, update references
    status: completed
  - id: hts-mocks
    content: Create HTS precompile mock contracts and example tests
    status: completed
  - id: contract-verification
    content: Configure hashscan-verify plugin and update verify workflow
    status: completed
  - id: remove-blockexplorer
    content: Remove the built-in /blockexplorer page (packages/nextjs/app/blockexplorer/) and all references to it
    status: in_progress
  - id: foundry-template
    content: Create packages/foundry with Hedera-configured foundry.toml, deploy scripts, tests
    status: cancelled
isProject: false
---

# Phase 1: Hedera Base Adaptation

## Design Decisions

- **No local chain**: Remove all `hardhat.id` local-chain logic. Developers will use Hedera testnet directly. Remove burner wallet flow entirely.
- **Same stack**: Keep RainbowKit, Wagmi, Viem -- only reconfigure for Hedera networks.
- **Remove Alchemy dependency**: Hedera uses Hashio RPC. Alchemy references should be cleaned up.

---

## 1.1 Frontend Chain Config

**File**: [packages/nextjs/scaffold.config.ts](packages/nextjs/scaffold.config.ts)

- Change `targetNetworks: [chains.hardhat]` to `[chains.hederaTestnet]`
- Add `rpcOverrides` for Hashio endpoints:
  - `[chains.hedera.id]: "https://mainnet.hashio.io/api"` (chain 295)
  - `[chains.hederaTestnet.id]: "https://testnet.hashio.io/api"` (chain 296)
- Remove `alchemyApiKey` from the config object and from the `ScaffoldConfig` type
- Remove `DEFAULT_ALCHEMY_API_KEY` export
- Keep `pollingInterval: 3000` (matches Hedera's ~3-5s finality)

## 1.2 Wagmi Config

**File**: [packages/nextjs/services/web3/wagmiConfig.tsx](packages/nextjs/services/web3/wagmiConfig.tsx)

- Remove `import { hardhat } from "viem/chains"` and the `hardhat` reference on line 42
- Remove Alchemy fallback logic (lines 29-36) -- the `rpcOverrides` path handles Hedera RPC
- Remove import of `DEFAULT_ALCHEMY_API_KEY` and `getAlchemyHttpUrl`
- Keep mainnet enabled for ENS resolution / price feeds (existing `enabledChains` logic)
- Simplify transport: `rpcOverrides` as primary, `http()` as fallback
- Apply `pollingInterval` to all chains (no local-chain exception needed)

## 1.3 Network Metadata and Alchemy Cleanup

**File**: [packages/nextjs/utils/scaffold-eth/networks.ts](packages/nextjs/utils/scaffold-eth/networks.ts)

- Remove `RPC_CHAIN_NAMES` map and `getAlchemyHttpUrl` function entirely (Hedera doesn't use Alchemy)
- Clean up `NETWORKS_EXTRA_DATA`: remove all non-Hedera entries, add Hedera entries:

```typescript
[chains.hedera.id]: {
  color: "#8259EF",
  nativeCurrencyTokenAddress: "0x...", // WHBAR on Ethereum mainnet (for price feed)
},
[chains.hederaTestnet.id]: {
  color: ["#8259EF", "#A98AFF"],
},
```

- Keep `mainnet` entry (needed since mainnet is always in `enabledChains` for ENS/price)

## 1.4 Block Explorer

**File**: [packages/nextjs/utils/scaffold-eth/networks.ts](packages/nextjs/utils/scaffold-eth/networks.ts)

Viem's Hedera chain defines `blockExplorers.default.url` as `https://hashscan.io/mainnet` (or `/testnet`). The existing `getBlockExplorerTxLink` appends `/tx/{hash}` which is correct for HashScan. However:

- **Fix `getBlockExplorerAddressLink`**: HashScan uses `/account/{address}` not `/address/{address}`. Detect Hedera chains and use the correct path.
- **Remove local block explorer fallback**: The `if (network.id === chains.hardhat.id)` branch returning `/blockexplorer/address/` should be removed (no local chain).
- **Update Etherscan fallback**: Change fallback from `https://etherscan.io/address/` to use HashScan for Hedera chains.

## 1.5 Remove Built-in Block Explorer Page

**Directory**: `packages/nextjs/app/blockexplorer/`

The built-in block explorer is designed for local Hardhat chain inspection. Since we're removing local chain support entirely and users should use HashScan for Hedera, remove it:

- Delete the entire `packages/nextjs/app/blockexplorer/` directory
- Remove the "Block Explorer" link from `page.tsx` (the card that links to `/blockexplorer`)
- Remove the "Block Explorer" link from `Footer.tsx` (the local-chain conditional that shows a `/blockexplorer` link)
- Remove any other references to `/blockexplorer` route across the codebase

## 1.6 Faucet Adaptation

**Files**:

- [packages/nextjs/components/scaffold-eth/FaucetButton.tsx](packages/nextjs/components/scaffold-eth/FaucetButton.tsx)
- [packages/nextjs/components/scaffold-eth/Faucet.tsx](packages/nextjs/components/scaffold-eth/Faucet.tsx)
- [packages/nextjs/components/Footer.tsx](packages/nextjs/components/Footer.tsx)
- **Remove the entire local faucet mechanism** (FaucetButton and Faucet components send ETH from Hardhat's pre-funded accounts -- not applicable)
- **Replace with a link to [Hedera Portal Faucet](https://portal.hedera.com/faucet)** when on `hederaTestnet` (chain 296)
- In `Footer.tsx`: Remove `Faucet` component import and the local-chain conditional rendering. Replace with a "Get testnet HBAR" link pointing to the Hedera Portal Faucet when on testnet.

## 1.7 Wallet Connectors

**File**: [packages/nextjs/services/web3/wagmiConnectors.tsx](packages/nextjs/services/web3/wagmiConnectors.tsx)

- **Remove `baseAccount`** (Coinbase -- Ethereum L2-specific, doesn't support Hedera)
- **Remove `rainbowkitBurnerWallet`** and the entire burner wallet conditional (no local chain)
- **Remove `burner-connector` import**
- **Remove `chains.hardhat` reference**
- Update `appName` from `"scaffold-eth-2"` to `"scaffold-hbar"` (or project name)
- Keep: `metaMaskWallet`, `walletConnectWallet`, `ledgerWallet`, `rainbowWallet`, `safeWallet`

## 1.8 Home Page and Branding

**Brand source**: [brand.hedera.com](https://brand.hedera.com/) -- all visual assets must follow these guidelines.

### Color Palette

Apply Hedera's official color palette across the UI (DaisyUI theme customization):

- **Primary**: Ultraviolet `#8259EF` (brand accent, buttons, links)
- **Primary gradient**: Ultraviolet `#8259EF` to Azure `#0031FF` (hero sections, highlights)
- **Background dark**: Charcoal `#11151D` (dark theme base)
- **Text muted**: Smoke `#9B9B9D` (secondary text)
- **Tertiary accents**: Cobalt `#2D84EB`, Indigo `#00156E`, Violet `#4F46E5`

### Logos and Favicon

- **Favicon**: Use the Hedera logomark (standalone H-in-circle) -- the brand guide explicitly recommends this for favicons. Download from the Hedera Logo Library on brand.hedera.com.
- **Header/nav logo**: Use the Hedera primary horizontal logo (wordmark + logomark). Must include the TM symbol per brand guidelines.
- Logo must have bounding space equal to the H in the logomark (per brand specs).
- Use black logo on light backgrounds, white logo on dark backgrounds. On colored backgrounds, use the transparent version over a Hedera palette color.

### Approved Phrasing

- Use **"Built on Hedera"** as the project tagline (approved phrasing per trademark policy)
- Refer to the network as "Hedera network" or "Hedera platform" (the mark is an adjective, never a noun/verb per brand guidelines)
- Native currency: "HBAR" (symbol: ℏ). The currency symbol must not replace the logomark.

### File Changes

- [packages/nextjs/app/page.tsx](packages/nextjs/app/page.tsx) -- Update "Welcome to" / "Scaffold-ETH 2" to "Built on Hedera" branding, remove `hardhat.id` check for block explorer link, update "Get started" text
- [packages/nextjs/components/Footer.tsx](packages/nextjs/components/Footer.tsx) -- Update "Fork me" link to your repo, replace "BuidlGuidl" attribution with Hedera disclaimer, update support link
- [packages/nextjs/app/layout.tsx](packages/nextjs/app/layout.tsx) -- Update metadata title/description via `getMetadata()`
- [packages/nextjs/utils/scaffold-eth/getMetadata.ts](packages/nextjs/utils/scaffold-eth/getMetadata.ts) -- Update `titleTemplate` from `"%s | Scaffold-ETH 2"` to Hedera equivalent
- `**packages/nextjs/public/favicon.png`** -- Replace with Hedera logomark (download from brand.hedera.com Logo Library)
- **DaisyUI theme** -- Update theme colors in Tailwind/DaisyUI config to match Hedera palette above

## 1.9 AI Agent Configs

**Files**: [AGENTS.md](AGENTS.md), `.cursor/rules/` (if any)

- Update `AGENTS.md` to reference Hedera instead of Ethereum where applicable
- Update network commands (e.g., `yarn deploy --network hederaTestnet`)
- Document Hedera EVM quirks (block.number, fallback/receive, etc.)
- Add Hedera-specific resources and links

---

## 1.10 Hardhat Config

**File**: [packages/hardhat/hardhat.config.ts](packages/hardhat/hardhat.config.ts)

- Add Hedera network entries:

```typescript
hederaTestnet: {
  url: "https://testnet.hashio.io/api",
  accounts: [deployerPrivateKey],
  chainId: 296,
},
hedera: {
  url: "https://mainnet.hashio.io/api",
  accounts: [deployerPrivateKey],
  chainId: 295,
},
```

- Change `defaultNetwork` from `"localhost"` to `"hederaTestnet"`
- Remove Alchemy-based network URLs (or keep as reference but make Hedera primary)
- Remove Hardhat forking config (Hedera doesn't support Alchemy forking)
- Install and configure `hashscan-verify` plugin:
  - `npm install -D hashscan-verify`
  - `import "hashscan-verify"` in config
- Enable `sourcify: { enabled: true }`
- Remove/update Etherscan config section

## 1.11 Deployment Script Verification

**File**: [packages/hardhat/deploy/00_deploy_your_contract.ts](packages/hardhat/deploy/00_deploy_your_contract.ts)

- Verify the script works on Hedera testnet (standard `hardhat-deploy` pattern should be compatible)
- Remove `autoMine: true` (not applicable on Hedera -- only works on local Hardhat node)
- Update comments to reference Hedera instead of localhost

## 1.12 Scripts (ECDSA Check)

**Files**: `packages/hardhat/scripts/` (generateAccount.ts, importAccount.ts, listAccount.ts, revealPK.ts, runHardhatDeployWithPK.ts)

- Verify all scripts use ECDSA (secp256k1) -- should already be the case
- Update any Hardhat-specific references or error messages
- Ensure `generateAccount.ts` generates ECDSA keys (compatible with Hedera)

## 1.13 Hedera Services Mocks (HTS Precompiles)

- Create mock contracts for Hedera precompiled contracts (e.g., HTS at `0x167`) so Hardhat tests can simulate Hedera-specific functionality
- These mocks allow developers to write and test contracts that interact with HTS without needing a live Hedera node
- Add example test files that demonstrate usage of the mocks

## 1.14 Contract Verification

- Install `hashscan-verify` (`npm install -D hashscan-verify`)
- Configure in `hardhat.config.ts`
- Verify command: `npx hardhat hashscan-verify <address> --contract contracts/MyContract.sol:MyContract --network hederaTestnet`
- Update `yarn verify` script if needed

## 1.15 Foundry Template

Create `packages/foundry/` mirroring the [SE-2 Foundry flavor](https://github.com/scaffold-eth/scaffold-eth-2/tree/foundry/packages/foundry) but configured for Hedera:

- `foundry.toml` -- Replace Alchemy RPC endpoints with Hashio:

```toml
[rpc_endpoints]
default_network = "https://testnet.hashio.io/api"
hederaTestnet = "https://testnet.hashio.io/api"
hedera = "https://mainnet.hashio.io/api"
```

- `contracts/YourContract.sol` -- Same as Hardhat version
- `script/DeployHelpers.s.sol` -- Adapt `ScaffoldETHDeploy` for Hedera (remove anvil-specific logic like `anvil_setBalance`, update chain ID checks)
- `script/Deploy.s.sol` and `script/DeployYourContract.s.sol` -- Standard Foundry deploy scripts
- `test/YourContract.t.sol` -- Example Foundry test
- `package.json`, `.env.example`, `remappings.txt`, `.gitignore`
- Update root `package.json` with Foundry-related scripts

---

## Verification Checklist

After all changes:

1. `yarn next:build` -- frontend compiles without errors
2. `yarn compile` -- Solidity compiles
3. `yarn deploy --network hederaTestnet` -- deploys to Hedera testnet
4. `yarn start` -- frontend connects to Hedera testnet
5. MetaMask can connect and interact with deployed contracts
6. Block explorer links open correctly on HashScan (both tx and address)
7. Faucet link navigates to Hedera Portal