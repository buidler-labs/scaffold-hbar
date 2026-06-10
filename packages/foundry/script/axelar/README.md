# Axelar ITS Bridge

This runbook uses the Common Prefix Hedera ITS implementation to create the Hedera-side token through Axelar ITS.

- Hedera is the origin chain for the new flow.
- `InterchainTokenFactory.deployInterchainToken` creates a native HTS token on Hedera.
- `InterchainTokenFactory.deployRemoteInterchainToken*` deploys the matching ERC20 interchain token on Sepolia.
- Token addresses are resolved with `InterchainTokenService.registeredTokenAddress(tokenId)`.
- This is an educational testnet starter, not a production-ready bridge.

Run all commands from `packages/foundry`.

## Flow

1. Configure `.env` with `ACCOUNT`, `SEPOLIA_RPC_URL`, and `HEDERA_TESTNET_RPC_URL`.
2. Deploy the Hedera-native ITS token:
   ```bash
   make axelar-deploy-hedera
   ```
   This funds/approves WHBAR for the token creation price, deploys the HTS token through ITS, writes `script/axelar/.salt` and `.tokenid`, and records the Hedera token/token-manager addresses.
3. Send the remote Sepolia deployment message:
   ```bash
   make axelar-deploy-sepolia
   ```
   Wait for the Axelar GMP message to execute on Sepolia.
4. Resolve the Sepolia token after execution:
   ```bash
   make axelar-resolve-sepolia-token
   ```
5. Mint test supply if the deployer kept minter rights:
   ```bash
   make axelar-mint-hedera AMOUNT=100000000
   make axelar-mint-sepolia AMOUNT=100000000
   ```
   Hedera mints through the HTS token manager. Sepolia mints directly on the remote ERC20 because the deployer is granted the ERC20 minter role.
6. Associate the Hedera wallet before receiving Sepolia -> Hedera transfers:
   ```bash
   make axelar-associate-hedera
   ```
7. Test Hedera -> Sepolia:
   ```bash
   make axelar-approve-hedera AMOUNT=100000000
   make axelar-send-from-hedera AMOUNT=100000000
   ```
8. Test Sepolia -> Hedera:
   ```bash
   make axelar-send-from-sepolia AMOUNT=100000000
   ```
9. Sync the proven config for the frontend later:
   ```bash
   make bridge-sync-next PROVIDER=axelar
   ```

Use `make axelar-status` at any point to print the saved salt/token id plus the resolved token-manager and registered-token addresses on both chains. If a command tells you a token is not associated, associate the Hedera account with the HTS token before retrying.

## Required `.env`

```bash
ACCOUNT=your_cast_alias
SEPOLIA_RPC_URL=https://...
HEDERA_TESTNET_RPC_URL=https://...
```

Optional native-flow settings:

```bash
AXELAR_TOKEN_NAME=BridgeToken
AXELAR_TOKEN_SYMBOL=BTK
AXELAR_TOKEN_DECIMALS=8

# Defaults to the deployer EOA. Keep this nonzero for testnet mint commands.
HEDERA_ITS_MINTER=0x...

# Defaults to HEDERA_ITS_MINTER / EOA. Set zero for no Sepolia testnet minter.
SEPOLIA_REMOTE_MINTER=0x...

# Hedera ITS token creation. Defaults query ITS and convert tinybars to JSON-RPC wei-style HBAR.
HEDERA_WHBAR_DEPOSIT_VALUE=
HEDERA_WHBAR_ALLOWANCE=
HEDERA_TOKEN_CREATION_PRICE_TINYBARS=
HEDERA_WHBAR_ADDRESS=

HEDERA_DEPLOY_GAS_LIMIT=15000000
HEDERA_TRANSFER_GAS_LIMIT=15000000
HEDERA_GAS_PRICE_WEI=
```

Axelar fee settings:

```bash
# Sepolia source-chain messages.
GAS_VALUE_ITS=0.0001ether
NATIVE_FEE_ITS=0.001ether

# Hedera source-chain transfers.
HEDERA_SEND_GAS_VALUE_ITS=2500000000
HEDERA_SEND_NATIVE_FEE_ITS=25000000000000000000

# Hedera -> Sepolia remote deployment message.
HEDERA_REMOTE_DEPLOY_GAS_VALUE_ITS=5000000000
HEDERA_REMOTE_DEPLOY_NATIVE_FEE_ITS=50000000000000000000

# Recovery add-gas value. Defaults to HEDERA_SEND_NATIVE_FEE_ITS.
HEDERA_ADD_GAS_NATIVE_FEE=25000000000000000000
```

The Hedera values are intentionally split:

- `HEDERA_*_GAS_VALUE_ITS` is tinybar-style and is passed to Axelar ITS/GasService.
- `HEDERA_*_NATIVE_FEE_ITS` is JSON-RPC `msg.value`, 18-decimal wei-style HBAR.
- Hedera -> Sepolia transfers use a higher default than the minimal testnet examples because the route goes through ITS Hub and then executes on Sepolia. Axelar refunds excess gas after execution.
- Remote Sepolia deployment uses an even higher default because the destination execution deploys a token contract. If AxelarScan still shows `INSUFFICIENT_GAS`, increase both `HEDERA_REMOTE_DEPLOY_*` values and rerun `make axelar-deploy-sepolia`.

## Generated State

The scripts write deployment-specific state here:

```text
script/axelar/.salt
script/axelar/.tokenid
deployments/bridge/axelar.json
```

These are local deployment artifacts and should not be committed.

The frontend sync command reads this state and updates:

```text
packages/nextjs/services/bridge/config/axelar.json
```

## Command Reference

| Command | What |
| --- | --- |
| `make axelar-deploy-hedera` | Fund WHBAR and deploy the Hedera-native HTS interchain token through ITS |
| `make axelar-fund-whbar-hedera` | Only deposit WHBAR and approve the ITS factory for token creation |
| `make axelar-deploy-sepolia` | Send the Hedera -> Sepolia remote token deployment message |
| `make axelar-resolve-hedera-token` | Resolve and record Hedera registered token/token-manager addresses |
| `make axelar-resolve-sepolia-token` | Resolve and record Sepolia registered token/token-manager addresses |
| `make axelar-status` | Print salt, token id, token managers, and registered token addresses |
| `make axelar-mint-hedera AMOUNT=...` | Mint test HTS supply through the Hedera token manager |
| `make axelar-mint-sepolia AMOUNT=...` | Mint test Sepolia supply directly through the remote ERC20 |
| `make axelar-associate-hedera` | Associate the connected Hedera account with the HTS token before receiving |
| `make axelar-approve-hedera AMOUNT=...` | Approve the correct Hedera spender for outbound ITS transfer |
| `make axelar-send-from-hedera AMOUNT=... [RECIPIENT=0x...]` | Send Hedera -> Sepolia |
| `make axelar-send-from-sepolia AMOUNT=... [RECIPIENT=0x...]` | Send Sepolia -> Hedera |
| `make axelar-add-gas-hedera TX_HASH=0x... LOG_INDEX=3` | Add native gas to recover a Hedera-sourced Axelar message |
| `make bridge-sync-next PROVIDER=axelar` | Sync recorded Axelar values into Next.js config |

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `InsufficientAllowance` during `axelar-deploy-hedera` | WHBAR allowance is missing or too low | Run `make axelar-fund-whbar-hedera` or increase `HEDERA_WHBAR_ALLOWANCE` |
| `InitialSupplyUnsupported` | Hedera ITS does not support initial supply for new HTS tokens | Deploy with zero initial supply, then mint after deployment |
| `ZeroSupplyToken` | Hedera deploy used zero initial supply and no minter | Keep `HEDERA_ITS_MINTER` as the deployer for testnet |
| Sepolia registered token is `0x000...` or query reverts | Axelar remote deployment has not executed yet | Wait in AxelarScan, then run `make axelar-resolve-sepolia-token` again |
| `SPENDER_DOES_NOT_HAVE_ALLOWANCE` on Hedera transfer | Wallet has not approved the spender selected for the token manager type | Run `make axelar-approve-hedera AMOUNT=...` |
| AxelarScan shows `EXECUTOR/INSUFFICIENT_GAS_FOR_EXECUTION` during remote deployment | The Hedera -> Sepolia remote deploy gas payment was too low for Sepolia contract creation | Increase `HEDERA_REMOTE_DEPLOY_GAS_VALUE_ITS` and `HEDERA_REMOTE_DEPLOY_NATIVE_FEE_ITS` together, then rerun `make axelar-deploy-sepolia` |
| Hedera transfer succeeds on-chain but AxelarScan shows `Insufficient Fee` or `EXECUTOR/INSUFFICIENT_GAS_FOR_EXECUTION` | Hedera source gas payment too low for the final Sepolia execution | For a sent message, run `make axelar-add-gas-hedera TX_HASH=0x... LOG_INDEX=3`; for future messages, increase `HEDERA_SEND_GAS_VALUE_ITS` and `HEDERA_SEND_NATIVE_FEE_ITS` together |
| `NotService(...)` while minting Sepolia | The remote ERC20 should be minted directly, not through the token manager | Use `make axelar-mint-sepolia AMOUNT=...` after this update |
| `InvalidAmount()` or selector `0x2c5211c6` while minting Hedera | The HTS mint amount exceeds Hedera's `int64` raw-unit limit | Mint a smaller raw amount, or deploy future tokens with the default `AXELAR_TOKEN_DECIMALS=8` |
| `MissingRole(..., 0)` while minting | The caller is not a minter | Deploy with `HEDERA_ITS_MINTER`/`SEPOLIA_REMOTE_MINTER` set to your EOA for testnet |

## Tests

Fast local regression tests live in `test/axelar`.

```bash
forge test --match-path 'test/axelar/*' -vvv
```

These tests verify address-byte encoding and script behavior without relying on live Axelar execution. Hedera live commands use `cast send` where the JSON-RPC relay and HTS precompile behavior is more faithful than local revm simulation.
