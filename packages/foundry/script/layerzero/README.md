# LayerZero OFT Bridge

Foundry step-by-step flow for Sepolia <-> Hedera Testnet using LayerZero V2
simple workers.

This is an educational testnet starter, not a production-ready bridge.

Run all commands from `packages/foundry`.

## Flow

1. Configure `.env` with `ACCOUNT`, `SEPOLIA_RPC_URL`, and `HEDERA_TESTNET_RPC_URL`.
2. Deploy the Sepolia OFT and Hedera HTS connector OFT.
3. Deploy simple worker contracts on both chains.
4. Wire both OFTs to each other and verify the peer configuration.
5. Associate the Hedera receiver account with the generated HTS token before receiving Sepolia -> Hedera transfers.
6. Send a small test transfer in either direction.
7. Relay the packet with `make layerzero-relay ...`, or use the Next.js automatic relay after syncing config and setting `LAYERZERO_RELAY_PRIVATE_KEY`.
8. Sync the proven config for the frontend:
   ```bash
   make bridge-sync-next PROVIDER=layerzero
   ```

## Required `.env`

```bash
ACCOUNT=your_cast_alias
SEPOLIA_RPC_URL=https://...
HEDERA_TESTNET_RPC_URL=https://testnet.hashio.io/api
```

Optional:

```bash
LAYERZERO_TOKEN_NAME=BridgeToken
LAYERZERO_TOKEN_SYMBOL=BTK
LAYERZERO_PREMINT_SEPOLIA=1000000000000000000
HEDERA_HTS_CREATE_VALUE=40ether
HEDERA_DEPLOY_GAS_LIMIT=15000000
HEDERA_TRANSFER_GAS_LIMIT=15000000
HEDERA_GAS_PRICE_WEI=
LAYERZERO_RELAY_LZRECEIVE_GAS=500000
```

## 1. Deploy OFTs

```bash
make layerzero-deploy-sepolia
make layerzero-deploy-hedera
```

The commands record the printed addresses in `deployments/bridge/layerzero.json`.
If you want to override them manually, set:

```bash
SEPOLIA_OFT=0x...
HEDERA_OFT=0x...
HEDERA_HTS_TOKEN=0x...
```

`HEDERA_HTS_TOKEN` is the token returned by `htsTokenAddress()` on the Hedera
connector.

## 2. Deploy Simple Workers

```bash
make layerzero-deploy-workers-sepolia
make layerzero-deploy-workers-hedera
```

The commands record the printed worker addresses. If you want to override them manually, set:

```bash
SEPOLIA_WORKERS_DVN=0x...
SEPOLIA_WORKERS_EXECUTOR=0x...
HEDERA_WORKERS_DVN=0x...
HEDERA_WORKERS_EXECUTOR=0x...
```

## 3. Wire

```bash
make layerzero-wire-sepolia
make layerzero-wire-hedera
make layerzero-verify-wiring
```

## 4. Associate the Hedera Receiver

Before receiving the native HTS token on Hedera, associate the receiver account:

```bash
make layerzero-associate-hedera
```

By default this associates the deployer EOA. To associate another receiver, run the command with that receiver's Foundry account as `ACCOUNT` and pass the same EVM address as `RECIPIENT`:

```bash
make layerzero-associate-hedera RECIPIENT=0x...
```

## 5. Send Sepolia -> Hedera

```bash
make layerzero-send-from-sepolia AMOUNT=10000000000000000
```

Copy the source transaction hash and relay it:

```bash
make layerzero-relay DIRECTION=sepolia-to-hedera TX=0x...
```

## 6. Send Hedera -> Sepolia

```bash
make layerzero-send-from-hedera AMOUNT=10000000000000000
```

Copy the source transaction hash and relay it:

```bash
make layerzero-relay DIRECTION=hedera-to-sepolia TX=0x...
```

## Sync the Next.js config

After the deploy and wire steps have completed, sync the recorded values into the frontend config:

```bash
make bridge-sync-next PROVIDER=layerzero
```

This updates `packages/nextjs/services/bridge/config/layerzero.json`. The generated state lives in
`packages/foundry/deployments/bridge/layerzero.json` and is ignored by git.

If you prefer to learn every moving piece manually, you can still copy values into `.env` and edit the
Next.js JSON yourself. The sync command is just a convenience for this educational template.

For automatic LayerZero relay from the UI, copy `packages/nextjs/.env.example` to `packages/nextjs/.env`, set `LAYERZERO_RELAY_PRIVATE_KEY` to a funded testnet-only key, and restart `yarn next:start`. If you do not set it, the UI still submits the source transfer and shows the manual relay command.

## Generated State

The scripts write deployment-specific state here:

```text
deployments/bridge/layerzero.json
```

This is local deployment state and should not be committed. The frontend sync command reads this file and updates:

```text
packages/nextjs/services/bridge/config/layerzero.json
```

## Helpers

```bash
make layerzero-help
make layerzero-deploy
make layerzero-associate-hedera
make layerzero-balances
make bridge-sync-next PROVIDER=layerzero
```

This test flow uses simple workers, so `layerzero-relay` is required. It parses
`PacketSent`, calls `SimpleDVNMock.verify`, then calls
`SimpleExecutorMock.commitAndExecute`.

## Command Reference

| Command | What |
| --- | --- |
| `make layerzero-help` | Print LayerZero tutorial commands |
| `make layerzero-deploy` | Deploy both OFTs and both simple-worker pairs |
| `make layerzero-deploy-sepolia` | Deploy the Sepolia OFT |
| `make layerzero-deploy-hedera` | Deploy the Hedera HTS connector OFT |
| `make layerzero-deploy-workers-sepolia` | Deploy the Sepolia simple DVN and executor |
| `make layerzero-deploy-workers-hedera` | Deploy the Hedera simple DVN and executor |
| `make layerzero-wire-sepolia` | Wire Sepolia OFT peer and workers for Hedera |
| `make layerzero-wire-hedera` | Wire Hedera OFT peer and workers for Sepolia |
| `make layerzero-verify-wiring` | Confirm both OFTs point at the expected remote peer |
| `make layerzero-associate-hedera [RECIPIENT=0x...]` | Associate a Hedera account with the generated HTS token |
| `make layerzero-send-from-sepolia AMOUNT=... [RECIPIENT=0x...]` | Send Sepolia -> Hedera |
| `make layerzero-send-from-hedera AMOUNT=... [RECIPIENT=0x...]` | Send Hedera -> Sepolia |
| `make layerzero-relay DIRECTION=... TX=0x...` | Manually deliver a source packet through the simple workers |
| `make layerzero-balances [RECIPIENT=0x...]` | Print Sepolia OFT and Hedera HTS balances |
| `make bridge-sync-next PROVIDER=layerzero` | Sync recorded LayerZero values into Next.js config |

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `HEDERA_HTS_TOKEN is required` | The Hedera OFT deploy did not record the generated HTS token, or `.env` overrides are incomplete | Run `make layerzero-deploy-hedera`, then check `deployments/bridge/layerzero.json` or set `HEDERA_HTS_TOKEN=0x...` |
| `TOKEN_NOT_ASSOCIATED_TO_ACCOUNT` or Hedera receive fails | The recipient is not associated with the generated HTS token | Run `make layerzero-associate-hedera RECIPIENT=0x...` with the receiver's `ACCOUNT`, then relay or resend |
| `make layerzero-verify-wiring` fails | One side is wired to the wrong peer or worker values are missing | Re-run both wire commands after deploy state is recorded |
| UI relay reports missing private key | The Next.js server has no funded relay key | Set `LAYERZERO_RELAY_PRIVATE_KEY` in `packages/nextjs/.env` and restart the app, or run `make layerzero-relay ...` manually |
| Relay fails with a missing earlier nonce | LayerZero packets must be delivered in nonce order | Relay earlier source transactions for the same route before retrying |

## Tests

There are no dedicated LayerZero unit tests in this starter yet. Run the shared compile/test checks before release:

```bash
forge compile
forge test -vvv
```
