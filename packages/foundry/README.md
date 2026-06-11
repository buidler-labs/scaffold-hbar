# Foundry Bridge Package

Solidity contracts, Forge scripts, tests, and runbooks for the Sepolia <-> Hedera Testnet bridge templates.

> **Template disclaimer:** this package is an educational starter. The Axelar ITS, Chainlink CCIP CCT, and LayerZero OFT contracts are not audited and are not production-ready. Use them to learn testnet bridge patterns and as a base for your own reviewed implementation.

## Testnet Setup

Run setup commands from the repo root unless a step says `cd packages/foundry`.

1. Install dependencies and submodules:
   ```bash
   git submodule update --init --recursive
   yarn install
   ```

2. Configure `packages/foundry/.env`:
   ```bash
   ACCOUNT=your_foundry_keystore_alias
   SEPOLIA_RPC_URL=https://...
   HEDERA_TESTNET_RPC_URL=https://testnet.hashio.io/api
   ```

3. Create or import a Foundry keystore:
   ```bash
   yarn foundry:account:generate
   # or
   yarn foundry:account:import
   ```

4. Fund the same EOA on both testnets:
   - Sepolia ETH for Sepolia deployments, provider fees, and sends.
   - Hedera testnet HBAR for Hedera deployments, HTS token creation, approvals, and sends.

5. Pick a provider and use its help menu:
   ```bash
   cd packages/foundry
   make axelar-help
   make ccip-help
   make layerzero-help
   ```

The provider helpers are the recommended tutorial path. The generic `yarn foundry:deploy --file ...` entrypoint remains available for custom scripts, but it is not the main bridge setup flow.

## Generated State and Frontend Sync

Successful bridge helper commands record deployed addresses under:

```text
packages/foundry/deployments/bridge/
```

Those files are local generated state and are ignored by git. After you finish the deploy/configure steps for a provider, sync those values into the Next.js bridge config:

```bash
cd packages/foundry
make bridge-sync-next PROVIDER=axelar
# or: PROVIDER=ccip, PROVIDER=layerzero, PROVIDER=all
```

The sync command updates:

```text
packages/nextjs/services/bridge/config/*.json
```

Keep generated bridge addresses in `deployments/bridge/` instead of copying them into `.env`. The helper scripts load that state before each step so repeated commands use the latest recorded deployment. Use `.env` for account names, RPC URLs, keys, and optional tuning values.

## Provider Tutorials

Each provider has a detailed runbook. Start with one provider, complete its setup, sync the frontend config, then test through the Next.js UI.

| Provider | Runbook | Explorer |
| --- | --- | --- |
| Axelar ITS | [`script/axelar/README.md`](script/axelar/README.md) | [AxelarScan testnet](https://testnet.axelarscan.io) |
| Chainlink CCIP CCT | [`script/ccip/README.md`](script/ccip/README.md) | [CCIP Explorer](https://ccip.chain.link) |
| LayerZero OFT | [`script/layerzero/README.md`](script/layerzero/README.md) | [LayerZero Scan testnet](https://testnet.layerzeroscan.com) |

## Axelar ITS

Axelar starts on Hedera: the Interchain Token Factory creates a native HTS token through the Hedera-compatible ITS deployment, then sends a remote deployment message so Sepolia gets the matching interchain ERC20. Token addresses are resolved with `registeredTokenAddress(tokenId)` after each deployment step.

```bash
cd packages/foundry

make axelar-deploy-hedera
make axelar-deploy-sepolia
# Wait for the remote deployment message in AxelarScan.
make axelar-resolve-sepolia-token

# Mint small test supply if you kept testnet minter rights.
make axelar-mint-hedera AMOUNT=100000000
make axelar-mint-sepolia AMOUNT=100000000

# Associate the Hedera account before receiving HTS tokens.
make axelar-associate-hedera

# Hedera -> Sepolia uses HTS/ERC20 allowance, so approve first.
make axelar-approve-hedera AMOUNT=100000000
make axelar-send-from-hedera AMOUNT=100000000

make axelar-send-from-sepolia AMOUNT=100000000

make bridge-sync-next PROVIDER=axelar
```

If AxelarScan reports `EXECUTOR/INSUFFICIENT_GAS_FOR_EXECUTION` for a Hedera-sourced message, add native gas with the source transaction hash and log index shown by AxelarScan:

```bash
make axelar-add-gas-hedera TX_HASH=0x... LOG_INDEX=3
```

Important: `HEDERA_BRIDGE_TOKEN` is the HTS token address returned by `InterchainTokenService.registeredTokenAddress(tokenId)`. It is the token itself and should not be replaced with the deployer EOA.

After syncing, start the frontend with `yarn next:start`, select **Axelar**, choose a direction, and send a small test amount.

## Chainlink CCIP CCT

CCIP deploys a burn-and-mint token plus token pool on Sepolia and Hedera Testnet. The default Hedera path is a vanilla EVM ERC20; an HTS-backed variant is available in the detailed runbook.

```bash
cd packages/foundry

make ccip-deploy-sepolia
make ccip-deploy-hedera

make ccip-configure-sepolia
make ccip-configure-hedera

make ccip-send-from-sepolia AMOUNT=1000000000
make ccip-send-from-hedera AMOUNT=1000000000

make bridge-sync-next PROVIDER=ccip
```

After syncing, start the frontend with `yarn next:start`, select **CCIP**, choose a direction, approve the router when prompted, and send a small test amount.

For native HTS experimentation, use `make ccip-deploy-hedera-hts` and follow [`script/ccip/README.md`](script/ccip/README.md).

## LayerZero OFT

LayerZero deploys a standard OFT on Sepolia and a Hedera HTS connector OFT on Hedera Testnet. This template uses simple workers for the educational relay flow.

```bash
cd packages/foundry

make layerzero-deploy-sepolia
make layerzero-deploy-hedera
make layerzero-deploy-workers-sepolia
make layerzero-deploy-workers-hedera

make layerzero-wire-sepolia
make layerzero-wire-hedera
make layerzero-verify-wiring

make layerzero-associate-hedera

make bridge-sync-next PROVIDER=layerzero
```

After syncing, start the frontend with `yarn next:start`, select **LayerZero**, choose a direction, approve if prompted, and send a small test amount. The UI attempts the relay flow for this template; the detailed runbook also documents manual `make layerzero-relay` usage.

For automatic LayerZero relay from the UI, copy `packages/nextjs/.env.example` to `packages/nextjs/.env`, set `LAYERZERO_RELAY_PRIVATE_KEY` to a funded testnet-only key, and restart the Next.js dev server. Without that key, use the manual relay command shown by the UI or runbook.

## Command Reference

| Command | Purpose |
| --- | --- |
| `make axelar-help` | Print Axelar tutorial commands |
| `make ccip-help` | Print CCIP tutorial commands |
| `make layerzero-help` | Print LayerZero tutorial commands |
| `make bridge-sync-next PROVIDER=<provider>` | Sync recorded bridge state into Next.js config |
| `yarn foundry:compile` | Compile contracts |
| `yarn foundry:test` | Run Foundry tests |
| `yarn foundry:lint` | Check Forge and JS formatting |
| `yarn foundry:verify:testnet` | Verify Hedera Testnet deployments on HashScan |

## Notes

- Keep placeholder addresses in `.env` commented until you have real deployed addresses.
- Use small amounts when testing bridge flows.
- Some Hedera HTS paths require the receiving account to associate with the token before receiving transfers.
- Hedera `cast send` and `forge script` commands use pre-EIP-1559 transaction mode because HashIO does not reliably support EIP-1559 transactions.
