# Next.js Bridge UI

The frontend package contains the bridge UI for testing the Sepolia <-> Hedera Testnet provider templates.

> **Educational disclaimer:** the UI interacts with example bridge contracts that are not audited and not production-ready. Use testnet accounts and small amounts only.

## What the App Shows

- `/` - the bridge UI for Axelar, CCIP, and LayerZero.
- `/debug` - optional contract debugging page for generated contract ABIs.

The bridge UI checks provider config, deployed contracts, wallet network, token balances, approvals, and submission status before sending a transfer.

## Configuration Sources

Bridge provider config lives in:

```text
packages/nextjs/services/bridge/config/
```

The Foundry provider helpers record deployed values under `packages/foundry/deployments/bridge/`. After you deploy and configure a provider, sync those values into the frontend:

```bash
cd packages/foundry
make bridge-sync-next PROVIDER=axelar
# or: PROVIDER=ccip, PROVIDER=layerzero, PROVIDER=all
```

The sync command updates:

- `packages/nextjs/services/bridge/config/axelar.json`
- `packages/nextjs/services/bridge/config/ccip.json`
- `packages/nextjs/services/bridge/config/layerzero.json`

Wallet and RPC settings are configured in `packages/nextjs/scaffold.config.ts`. By default the app targets Hedera Testnet and Ethereum Sepolia.

## Test the UI

Run these steps after completing one Foundry provider runbook and syncing the config.

1. Start the app from the repo root:
   ```bash
   yarn next:start
   ```

2. Open [http://localhost:3000](http://localhost:3000).

3. Connect the wallet for the same EOA used and funded during the Foundry setup.

4. Select the provider you configured: **Axelar**, **CCIP**, or **LayerZero**.

5. Select the direction:
   - Sepolia to Hedera
   - Hedera to Sepolia

6. Enter a small test amount. Use the same token decimals described in the provider runbook.

7. Confirm the readiness panel has no missing config or contract errors.

8. Check balances and any HTS association notices. If the UI reports an HTS association issue, associate the account with the native Hedera token before receiving.

9. Approve when prompted. Different providers need different approvals:
   - Axelar Hedera -> Sepolia needs HTS token approval for ITS.
   - CCIP needs router approval; HTS-backed CCIP can also need wrapper approval.
   - LayerZero Hedera -> Sepolia can need HTS token approval for the connector.

10. Send the transfer and track it:
    - Axelar: [AxelarScan testnet](https://testnet.axelarscan.io)
    - CCIP: [CCIP Explorer](https://ccip.chain.link)
    - LayerZero: [LayerZero Scan testnet](https://testnet.layerzeroscan.com)

LayerZero in this template uses an educational simple-worker relay. The UI attempts the relay flow; the Foundry runbook also documents manual `make layerzero-relay` usage if you need to deliver a specific source transaction.

## Commands

Run these from the repo root.

| Command | Purpose |
| --- | --- |
| `yarn next:start` | Start the development server |
| `yarn next:build` | Build the app |
| `yarn next:check-types` | Run TypeScript checks |
| `yarn next:lint` | Run Next.js linting |
| `yarn next:vercel:yolo --prod` | Deploy the frontend with the existing Vercel helper |

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| Provider shows missing config | Run `make bridge-sync-next PROVIDER=<provider>` after deployment |
| Wallet is on the wrong network | Switch to the source chain selected in the bridge UI |
| Balance is zero | Confirm you are using the same EOA from the Foundry runbook and that the previous bridge step completed |
| Approval button does not clear | Wait for the approval transaction to confirm, then refresh the quote/status |
| Transfer submitted but not delivered | Track the message in the provider explorer and follow the provider runbook troubleshooting section |
