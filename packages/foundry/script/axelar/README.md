# Axelar ITS Bridge

This template wires a custom Sepolia ERC20 to a native Hedera HTS token through Axelar Interchain Token Service.

- Sepolia deploys `BridgeToken`, an ERC20 with mint/burn access controlled by Axelar's Token Manager.
- Hedera deploys `MyBridgeHtsToken`, a wrapper contract that creates a native HTS fungible token.
- The address used by Axelar on Hedera is the HTS mirror token address returned by `MyBridgeHtsToken.token()`, not the wrapper contract address.

Run all commands from `packages/foundry`.

## Flow

1. Configure your account and RPC URLs in `.env`.
2. Deploy `BridgeToken` on Sepolia.
3. Deploy `MyBridgeHtsToken` on Hedera.
4. The deploy helpers record the deployed Sepolia token and Hedera HTS mirror token locally.
5. Register token metadata on both chains and wait until both Axelar GMP messages are received.
6. Register the Sepolia custom token with ITS. This writes `.salt` and `.tokenid`.
7. Link the Sepolia token to the Hedera HTS token and wait until the Axelar GMP message is received.
8. Transfer Sepolia mint/burn access to the Sepolia Axelar Token Manager.
9. Send a small Sepolia to Hedera test transfer.
10. For Hedera to Sepolia, approve the Hedera HTS token for ITS, then send with Hedera-specific gas units.

## Required `.env`

```bash
ACCOUNT=your_cast_alias
SEPOLIA_RPC_URL=https://...
HEDERA_TESTNET_RPC_URL=https://...
```

After deployment, the helpers record these values in `deployments/bridge/axelar.json`.
You can still set them manually in `.env` if you want to override or debug a step:

```bash
SEPOLIA_BRIDGE_TOKEN=0x... # BridgeToken contract on Sepolia
HEDERA_BRIDGE_TOKEN=0x...  # HTS mirror token address from MyBridgeHtsToken.token()
```

The remote link step always uses `HEDERA_BRIDGE_TOKEN` as the destination token:

```bash
HEDERA_LINK_DESTINATION_CHAIN=hedera
HEDERA_LINK_DESTINATION_MANAGER_TYPE=2
```

Do not use the `MyBridgeHtsToken` wrapper contract address as `HEDERA_BRIDGE_TOKEN`.

Optional settings:

```bash
AXELAR_TOKEN_NAME=BridgeToken
AXELAR_TOKEN_SYMBOL=BTK
AXELAR_INITIAL_SUPPLY=1000000000000000000
HEDERA_INITIAL_SUPPLY=1000000000000000000
SEPOLIA_DEV_MINTER=0x0000000000000000000000000000000000000000
ETHERSCAN_API_KEY=...
HEDERA_HTS_CREATE_VALUE=20ether
HEDERA_DEPLOY_GAS_LIMIT=15000000
HEDERA_TRANSFER_GAS_LIMIT=15000000
GAS_VALUE_ITS=0.0001ether
NATIVE_FEE_ITS=0.001ether
HEDERA_METADATA_GAS_VALUE_ITS=0
HEDERA_METADATA_NATIVE_FEE_ITS=0
HEDERA_SEND_GAS_VALUE_ITS=100000000
HEDERA_SEND_NATIVE_FEE_ITS=1000000000000000000
HEDERA_GAS_PRICE_WEI=...
```

Hedera metadata registration defaults to `gasValue=0` and `msg.value=0`; nonzero values have been observed to revert on testnet.

Hedera source-chain transfers use different native-value units for Axelar gas payment:

- `HEDERA_SEND_GAS_VALUE_ITS` is tinybar-style. For example, `100000000` is `1 HBAR`.
- `HEDERA_SEND_NATIVE_FEE_ITS` is JSON-RPC `msg.value`, 18-decimal wei-style HBAR. For example, `1000000000000000000` is also `1 HBAR`.

This split follows Hedera's 8-decimal native HBAR accounting versus 18-decimal JSON-RPC `msg.value` compatibility. If `gasValue` is passed as an Ethereum-style value such as `0.0001ether`, Hedera transfers can revert or be under/over-accounted by Axelar Gas Service. The wrapper defaults have been tested with Hedera -> Sepolia ITS transfers.

`HEDERA_INITIAL_SUPPLY` is passed as `int64` to the HTS precompile. With 18-decimal amounts, keep the value inside the signed 64-bit range. If the initial HTS mint/transfer fails because the receiver is not associated with the token, associate the account first or deploy with `HEDERA_INITIAL_SUPPLY=0` and mint later.

## Step-by-step

### 1. Deploy on Sepolia

```bash
make axelar-deploy-sepolia
```

The command records the deployed `BridgeToken` address. If you want to override it manually, set:

```bash
SEPOLIA_BRIDGE_TOKEN=0x...
```

Verify if needed:

```bash
make axelar-verify-sepolia ADDR=$SEPOLIA_BRIDGE_TOKEN
```

### 2. Deploy on Hedera

```bash
make axelar-deploy-hedera
```

The command prints the wrapper contract address. Verify the wrapper with:

```bash
make axelar-verify-hedera ADDR=0x_wrapper_contract
```

The command records the wrapper and the HTS mirror token address from `MyBridgeHtsToken.token()`.
If you want to override it manually, set:

```bash
HEDERA_BRIDGE_TOKEN=0x0000000000000000000000000000000000...
```

### 3. Register metadata on both chains

```bash
make axelar-metadata-sepolia
make axelar-metadata-hedera
```

Track both transaction hashes in AxelarScan testnet under General Message Passing. Wait until both `TokenMetadataRegistered` messages are received before moving on.

If `metadata-sepolia` reverts with `call to non-contract address`, `SEPOLIA_BRIDGE_TOKEN` is probably set to your deployer EOA instead of the Sepolia `BridgeToken` contract.

### 4. Register the Sepolia custom token

```bash
make axelar-register-custom
```

This registers the Sepolia token with a mint/burn Token Manager and writes:

```text
script/axelar/.salt
script/axelar/.tokenid
```

These files are deployment-specific and intentionally ignored by git. Later steps read them automatically.
The bridge config helper also records the generated token id for frontend sync.

### 5. Link the Hedera token

```bash
make axelar-link-remote
```

This sends a cross-chain link message from Sepolia to Hedera. Wait in AxelarScan until the link message is received before sending transfers.

### 6. Transfer Sepolia mintership

```bash
make axelar-transfer-mintership-sepolia
```

This gives the Sepolia Axelar Token Manager permission to mint and burn `BridgeToken`.

Do not run this for Hedera in this template. Hedera uses the HTS mirror token with a lock/unlock manager, and the HTS token does not expose the same `transferMintership()` function as the Sepolia ERC20.

If a Sepolia to Hedera transfer reverts with `MissingRole(tokenManager, 0)` or `TakeTokenFailed`, this step was missed or used the wrong `.tokenid`.

### 7. Send a test transfer

For `0.1` token with 18 decimals from Sepolia to Hedera:

```bash
make axelar-send-from-sepolia AMOUNT=100000000000000000
```

By default the recipient is the deployer EOA. To override:

```bash
make axelar-send-from-sepolia AMOUNT=100000000000000000 RECIPIENT=0x...
```

Track the transaction in AxelarScan under Token Transfers.

### 8. Send Hedera back to Sepolia

Hedera uses a lock/unlock Token Manager, so ITS pulls the HTS token from your account with `transferFrom`. Approve the amount first:

```bash
make axelar-approve-hedera AMOUNT=100000000000000000
```

Then send the same amount from Hedera to Sepolia:

```bash
make axelar-send-from-hedera AMOUNT=100000000000000000
```

The Hedera send wrapper uses direct `cast send` instead of `forge script` because Forge/revm does not faithfully execute Hedera HTS precompile behavior during local script execution. It also uses Hedera-specific gas defaults:

```bash
HEDERA_SEND_GAS_VALUE_ITS=100000000
HEDERA_SEND_NATIVE_FEE_ITS=1000000000000000000
```

These values pay `1 HBAR` to Axelar Gas Service. Hedera -> Sepolia routes through ITS Hub, so lower values can pass Hedera confirmation and Axelar approval but still fail the final Sepolia execution with `EXECUTOR/INSUFFICIENT_GAS_FOR_EXECUTION`. If AxelarScan reports `Insufficient Fee`, increase both values consistently: the first in tinybar-style units and the second in 18-decimal `msg.value` units.

## Sync the Next.js config

After the deploy and setup steps have completed, sync the recorded values into the frontend config:

```bash
make bridge-sync-next PROVIDER=axelar
```

This updates `packages/nextjs/services/bridge/config/axelar.json`. The generated state lives in
`packages/foundry/deployments/bridge/axelar.json` and is ignored by git.

If you prefer to learn every moving piece manually, you can still copy values into `.env` and edit the
Next.js JSON yourself.

## Command Reference

| Command | What |
| --- | --- |
| `make axelar-deploy` | Run the Sepolia and Hedera deploy steps |
| `make axelar-deploy-sepolia` | Deploy `BridgeToken` on Sepolia |
| `make axelar-deploy-hedera` | Deploy `MyBridgeHtsToken` on Hedera |
| `make axelar-verify-sepolia ADDR=0x...` | Verify `BridgeToken` on Etherscan |
| `make axelar-verify-hedera ADDR=0x...` | Verify `MyBridgeHtsToken` on HashScan |
| `make axelar-metadata-sepolia` | Register Sepolia token metadata with ITS |
| `make axelar-metadata-hedera` | Register Hedera HTS token metadata with ITS |
| `make axelar-register-custom` | Register the Sepolia custom token and write `.salt` / `.tokenid` |
| `make axelar-link-remote` | Link the Sepolia token to the Hedera HTS token |
| `make axelar-transfer-mintership-sepolia` | Transfer Sepolia token mint/burn access to its Token Manager |
| `make axelar-send-from-sepolia AMOUNT=... [RECIPIENT=0x...]` | Send Sepolia to Hedera |
| `make axelar-approve-hedera AMOUNT=...` | Approve the Hedera HTS token for ITS lock/unlock transfers |
| `make axelar-send-from-hedera AMOUNT=... [RECIPIENT=0x...]` | Send Hedera to Sepolia after the remote side is funded and associated |
| `make bridge-sync-next PROVIDER=axelar` | Sync recorded Axelar values into the Next.js config |

The same steps can be called directly:

```bash
bash script/axelar/bridge-axelar.sh deploy-sepolia
bash script/axelar/bridge-axelar.sh deploy-hedera
bash script/axelar/bridge-axelar.sh metadata-sepolia
bash script/axelar/bridge-axelar.sh metadata-hedera
bash script/axelar/bridge-axelar.sh register-custom
bash script/axelar/bridge-axelar.sh link-remote
bash script/axelar/bridge-axelar.sh transfer-mintership-sepolia
AMOUNT=100000000000000000 bash script/axelar/bridge-axelar.sh send-from-sepolia
AMOUNT=100000000000000000 bash script/axelar/bridge-axelar.sh approve-hedera
AMOUNT=100000000000000000 bash script/axelar/bridge-axelar.sh send-from-hedera
```

## Troubleshooting

`DONE` should only print after a successful command. The shell wrapper uses `set -euo pipefail` so failed Forge or Cast commands stop the script.

Common issues:

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `call to non-contract address` during `metadata-sepolia` | `SEPOLIA_BRIDGE_TOKEN` is an EOA | Set it to the deployed Sepolia `BridgeToken` address |
| `TokenManagerDoesNotExist` before registration | First registration path | `axelar-register-custom` handles this with `try/catch` and proceeds |
| `MissingRole(..., 0)` or `TakeTokenFailed` on Sepolia transfer | Sepolia Token Manager cannot burn | Run `make axelar-transfer-mintership-sepolia` |
| `SPENDER_DOES_NOT_HAVE_ALLOWANCE` on Hedera transfer | ITS cannot pull the HTS token into the lock/unlock manager | Run `make axelar-approve-hedera AMOUNT=...` before sending |
| Hedera transfer succeeds on-chain but AxelarScan shows `Insufficient Fee` | Hedera source gas payment too low | Increase `HEDERA_SEND_GAS_VALUE_ITS` and `HEDERA_SEND_NATIVE_FEE_ITS` together |
| Hedera transfer reverts when `GAS_VALUE_ITS=0.0001ether` is reused | Hedera Axelar gas path needs Hedera-specific native units | Use `HEDERA_SEND_GAS_VALUE_ITS` / `HEDERA_SEND_NATIVE_FEE_ITS`, not Sepolia `GAS_VALUE_ITS` |
| Hedera deploy succeeds but metadata uses wrong token | Wrapper address used instead of HTS mirror | Use `MyBridgeHtsToken.token()` as `HEDERA_BRIDGE_TOKEN` |

## Tests

Fast local regression tests live in `test/axelar`.

```bash
forge test --match-path 'test/axelar/*' -vvv
```

These tests verify that Axelar destination token and recipient addresses are encoded as 20-byte address bytes via `AddressBytes.toBytes()`, not as 32-byte ABI words. The Sepolia send script uses the Axelar testnet-compatible 6-argument `interchainTransfer` overload with empty metadata and `GAS_VALUE_ITS`. Hedera sends use direct `cast send` in the shell wrapper to avoid local revm limitations around HTS precompile execution.
