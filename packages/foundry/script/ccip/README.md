# CCIP CCT Burn & Mint Bridge

This template follows Chainlink's Burn & Mint Cross-Chain Token flow with Foundry.

- Sepolia deploys a `BurnMintERC20` and `BurnMintTokenPool`.
- Hedera Testnet deploys the same vanilla `BurnMintERC20` and `BurnMintTokenPool` on Hedera EVM.
- Hedera Testnet can alternatively deploy an HTS-backed wrapper (`HtsBurnMintERC20`) and
  `HtsBurnMintTokenPool`. In that mode, CCIP registers the wrapper address, while users hold the native HTS token.
- The flow uses EOA registration through `RegistryModuleOwnerCustom`, then `TokenAdminRegistry.acceptAdminRole`, `setPool`, `applyChainUpdates`, and `ccipSend`.

Reference: [Chainlink CCIP Burn & Mint tutorial](https://docs.chain.link/ccip/tutorials/evm/cross-chain-tokens/register-from-eoa-burn-mint-hardhat).

Run all commands from `packages/foundry`.

## Flow

1. Configure your account and RPC URLs in `.env`.
2. Deploy the Sepolia token and pool.
3. Deploy the Hedera token and pool.
4. Put all four deployed addresses in `.env`.
5. Configure the Sepolia pool with the Hedera remote lane.
6. Configure the Hedera pool with the Sepolia remote lane.
7. Send a small test transfer in either direction.

## Required `.env`

```bash
ACCOUNT=your_cast_alias
SEPOLIA_RPC_URL=https://...
HEDERA_TESTNET_RPC_URL=https://...
```

Optional deployment settings:

```bash
CCIP_TOKEN_NAME=BestToken
CCIP_TOKEN_SYMBOL=BTK
CCIP_TOKEN_DECIMALS=8
CCIP_PREMINT_SEPOLIA=10000000000
CCIP_PREMINT_HEDERA=10000000000
CCIP_PREMINT_HEDERA_HTS=0
CCIP_HEDERA_HTS_CREATE_VALUE=20ether
```

After deployment, add:

```bash
CCIP_SEPOLIA_TOKEN=0x...
CCIP_SEPOLIA_POOL=0x...
CCIP_HEDERA_TOKEN=0x...
CCIP_HEDERA_POOL=0x...
CCIP_HEDERA_HTS_TOKEN=0x... # only for HTS-backed Hedera deploys
```

Do not reuse Axelar's `SEPOLIA_BRIDGE_TOKEN` or `HEDERA_BRIDGE_TOKEN` values for CCIP.
For HTS-backed CCIP, `CCIP_HEDERA_TOKEN` is the wrapper contract registered with CCIP; `CCIP_HEDERA_HTS_TOKEN`
is the native HTS token users see in Hedera wallets.

## Step-by-step

### 1. Deploy on Sepolia

```bash
make ccip-deploy-sepolia
```

Copy the printed addresses into `.env`:

```bash
CCIP_SEPOLIA_TOKEN=0x...
CCIP_SEPOLIA_POOL=0x...
```

### 2. Deploy on Hedera

For a vanilla EVM ERC20 on Hedera:

```bash
make ccip-deploy-hedera
```

Copy the printed addresses into `.env`:

```bash
CCIP_HEDERA_TOKEN=0x...
CCIP_HEDERA_POOL=0x...
```

For a native HTS-backed token on Hedera:

```bash
make ccip-deploy-hedera-hts
```

Copy all three printed addresses into `.env`:

```bash
CCIP_HEDERA_TOKEN=0x...      # wrapper registered with CCIP
CCIP_HEDERA_WRAPPER=0x...    # optional alias, same as CCIP_HEDERA_TOKEN
CCIP_HEDERA_POOL=0x...
CCIP_HEDERA_HTS_TOKEN=0x...  # native HTS token
```

### 3. Configure both pools

```bash
make ccip-configure-sepolia
make ccip-configure-hedera
```

Rate limiters are disabled by default. Update `ConfigurePool.s.sol` arguments in the wrapper if you want rate-limited lanes.

### 4. Send a test transfer

For `10` tokens with 8 decimals from Sepolia to Hedera:

```bash
make ccip-send-from-sepolia AMOUNT=1000000000
```

For Hedera back to Sepolia:

```bash
make ccip-send-from-hedera AMOUNT=1000000000
```

For HTS-backed Hedera back to Sepolia:

```bash
make ccip-send-from-hedera-hts AMOUNT=1000000000
```

The HTS-backed send performs both required approvals:

1. Native HTS token approval from the user to the wrapper.
2. Wrapper ERC20 approval from the user to the CCIP Router.

By default the recipient is the deployer EOA. To override:

```bash
make ccip-send-from-sepolia AMOUNT=1000000000 RECIPIENT=0x...
```

Track messages on [CCIP Explorer](https://ccip.chain.link).

## Command Reference

| Command | What |
| --- | --- |
| `make ccip-help` | Print CCIP commands |
| `make ccip-deploy-sepolia` | Deploy Sepolia `BurnMintERC20` + pool and register/set pool |
| `make ccip-deploy-hedera` | Deploy Hedera EVM `BurnMintERC20` + pool and register/set pool |
| `make ccip-deploy-hedera-hts` | Deploy Hedera HTS-backed wrapper + pool and register/set pool |
| `make ccip-configure-sepolia` | Configure Sepolia pool for Hedera |
| `make ccip-configure-hedera` | Configure Hedera pool for Sepolia |
| `make ccip-associate-hedera [RECIPIENT=0x...]` | Associate an account with the native Hedera HTS token |
| `make ccip-approve-hedera-hts AMOUNT=...` | Approve the wrapper to pull native Hedera HTS tokens |
| `make ccip-send-from-sepolia AMOUNT=... [RECIPIENT=0x...]` | Send Sepolia to Hedera, paying native fees |
| `make ccip-send-from-hedera AMOUNT=... [RECIPIENT=0x...]` | Send Hedera to Sepolia, paying native fees |
| `make ccip-send-from-hedera-hts AMOUNT=... [RECIPIENT=0x...]` | Send HTS-backed Hedera token to Sepolia |

The same steps can be called directly:

```bash
bash script/ccip/bridge-ccip.sh deploy-sepolia
bash script/ccip/bridge-ccip.sh deploy-hedera
bash script/ccip/bridge-ccip.sh deploy-hedera-hts
bash script/ccip/bridge-ccip.sh configure-sepolia
bash script/ccip/bridge-ccip.sh configure-hedera
bash script/ccip/bridge-ccip.sh associate-hedera
AMOUNT=1000000000 bash script/ccip/bridge-ccip.sh approve-hedera-hts
AMOUNT=1000000000 bash script/ccip/bridge-ccip.sh send-from-sepolia
AMOUNT=1000000000 bash script/ccip/bridge-ccip.sh send-from-hedera
AMOUNT=1000000000 bash script/ccip/bridge-ccip.sh send-from-hedera-hts
```

## Troubleshooting

`DONE` should only print after a successful command. The shell wrapper uses `set -euo pipefail` so failed Forge or Cast commands stop the script.

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `CCIP_* is required` | A deployed address is missing from `.env` | Copy token/pool addresses from deploy output |
| `call to non-contract address` | A token or pool env var is set to an EOA or wrong address | Re-check the deploy output and `.env` |
| `Only callable by owner` or admin errors | The configured `ACCOUNT` is not the deploying/admin EOA | Use the same Foundry keystore alias for deploy and configure |
| `InsufficientFeeTokenAmount()` | Native CCIP fee was underpaid | For Hedera sends, see `HEDERA_NATIVE_FEE_NOTES.md` |
| Hedera simulation behaves differently from broadcast | Hedera native fee units differ under JSON-RPC relay | `send-from-hedera` uses direct `cast send` and fee scaling from `HEDERA_NATIVE_FEE_NOTES.md` |
| HTS transfer or mint to recipient fails | Recipient is not associated with the native HTS token | Run `make ccip-associate-hedera` for the receiving account before receiving HTS tokens |
| Hedera HTS send fails with allowance errors | Missing native HTS approval to wrapper or wrapper approval to router | Use `make ccip-send-from-hedera-hts`, or run `make ccip-approve-hedera-hts AMOUNT=...` first |

## Tests

```bash
forge test --match-path 'test/ccip/*' -vvv
```
