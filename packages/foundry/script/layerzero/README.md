# LayerZero OFT Bridge

Foundry step-by-step flow for Sepolia <-> Hedera Testnet using LayerZero V2
simple workers.

Run all commands from `packages/foundry`.

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

## 4. Send Sepolia -> Hedera

```bash
make layerzero-send-from-sepolia AMOUNT=10000000000000000
```

Copy the source transaction hash and relay it:

```bash
make layerzero-relay DIRECTION=sepolia-to-hedera TX=0x...
```

## 5. Send Hedera -> Sepolia

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

## Helpers

```bash
make layerzero-help
make layerzero-deploy
make layerzero-balances
make bridge-sync-next PROVIDER=layerzero
```

This test flow uses simple workers, so `layerzero-relay` is required. It parses
`PacketSent`, calls `SimpleDVNMock.verify`, then calls
`SimpleExecutorMock.commitAndExecute`.
