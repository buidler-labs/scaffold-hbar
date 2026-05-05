# Foundry package (Hedera)

Solidity contracts, Forge scripts, and tests for the Hedera EVM.

> **Template disclaimer:** this package is an educational starter. It is not a
> production-ready bridge. Use it to learn the CCIP Cross-Chain Token (CCT)
> lifecycle and as a base for your own implementation.

---

## Setup

Forge dependencies are tracked as git submodules under `packages/foundry/lib`.
Initialize them from the repo root:

```bash
git submodule update --init --recursive
```

---

## Deploy (Foundry)

From the repo root, use **`yarn foundry:deploy`** (runs `packages/foundry`'s
deploy script). Inside `packages/foundry`, use **`yarn deploy`** (same entry).

- **Local:** start the shared local chain, then deploy with `--network localhost`.
  ```bash
  yarn hardhat:chain
  yarn foundry:deploy --network localhost
  ```
- **Hedera testnet / mainnet:** `--network hedera_testnet` / `--network hedera_mainnet`.

---

## Axelar ITS template (Sepolia to Hedera Testnet)

This package includes an Axelar Interchain Token Service bridge template that links a Sepolia ERC20 to a native Hedera HTS token.

The detailed runbook lives in [`script/axelar/README.md`](script/axelar/README.md).

### What ships

| Piece | Purpose |
| --- | --- |
| `contracts/axelar/BridgeToken.sol` | Sepolia ERC20 with Axelar-compatible mint/burn hooks. |
| `contracts/axelar/MyBridgeHtsToken.sol` | Hedera deploy target that creates the native HTS fungible token. |
| `contracts/axelar/BridgeHtsToken.sol` | Shared HTS wrapper logic used by the Hedera deploy target. |
| `script/axelar/*.s.sol` | Foundry scripts for metadata registration, custom-token registration, remote linking, mintership, and transfers. |
| `script/axelar/bridge-axelar.sh` | Shell wrapper used by the `make axelar-*` commands. |
| `script/axelar/bridge-axelar.mk` | Make targets included from the package Makefile. |

### Happy path

```bash
cd packages/foundry

make axelar-deploy-sepolia
make axelar-deploy-hedera
# Set SEPOLIA_BRIDGE_TOKEN and HEDERA_BRIDGE_TOKEN in .env.

make axelar-metadata-sepolia
make axelar-metadata-hedera
# Wait for both TokenMetadataRegistered messages in AxelarScan.

make axelar-register-custom
make axelar-link-remote
# Wait for the link message in AxelarScan.

make axelar-transfer-mintership-sepolia
make axelar-send-from-sepolia AMOUNT=100000000000000000

# Hedera -> Sepolia uses a lock/unlock manager, so approve first.
make axelar-approve-hedera AMOUNT=100000000000000000
make axelar-send-from-hedera AMOUNT=100000000000000000
```

Important address distinction: `HEDERA_BRIDGE_TOKEN` must be the HTS mirror token address returned by `MyBridgeHtsToken.token()`, not the deployed wrapper contract address.

Hedera source transfers use Hedera-specific Axelar gas units. See `script/axelar/README.md` for the `HEDERA_SEND_GAS_VALUE_ITS` and `HEDERA_SEND_NATIVE_FEE_ITS` split.

---

## CCIP CCT Burn & Mint template (Sepolia ⇄ Hedera Testnet)

This package includes a Chainlink CCIP Cross-Chain Token Burn & Mint template,
following the EOA registration flow from the Chainlink tutorial:
[`register-from-eoa-burn-mint-hardhat`](https://docs.chain.link/ccip/tutorials/evm/cross-chain-tokens/register-from-eoa-burn-mint-hardhat).

The detailed runbook lives in [`script/ccip/README.md`](script/ccip/README.md).

### What ships

| Piece | Purpose |
| --- | --- |
| `script/ccip/bridge-ccip.sh` | Step-based shell wrapper used by the `make ccip-*` commands. |
| `script/ccip/bridge-ccip.mk` | Make targets included from the package Makefile. |
| `script/ccip/HelperConfig.s.sol` | Chain-specific CCIP addresses (router, RMN, TokenAdminRegistry, RegistryModuleOwnerCustom, chain selectors) for Sepolia + Hedera Testnet. |
| `script/ccip/TokenAndPoolDeployer.s.sol` | Deploys a vanilla `BurnMintERC20` + `BurnMintTokenPool`, grants mint/burn roles, and completes the admin lifecycle (`registerAdminViaGetCCIPAdmin` → `acceptAdminRole` → `setPool`). |
| `script/ccip/ConfigurePool.s.sol` | `applyChainUpdates` for one remote lane, with explicit rate-limiter args. |
| `script/ccip/BridgeTokens.s.sol` | EOA `ccipSend` paying fees in native gas. |

### Happy path

```bash
cd packages/foundry

make ccip-deploy-sepolia
make ccip-deploy-hedera
# Set CCIP_SEPOLIA_TOKEN, CCIP_SEPOLIA_POOL, CCIP_HEDERA_TOKEN,
# and CCIP_HEDERA_POOL in .env.

make ccip-configure-sepolia
make ccip-configure-hedera

make ccip-send-from-sepolia AMOUNT=1000000000
make ccip-send-from-hedera AMOUNT=1000000000
```

This is the vanilla CCIP CCT path on Hedera EVM. The HTS-aware contracts under
`contracts/ccip/` are available for experimentation through the HTS-specific
runbook.

Track CCIP messages on [ccip.chain.link](https://ccip.chain.link).

---

## LayerZero OFT template (Sepolia ⇄ Hedera Testnet)

A LayerZero V2 Omnichain Fungible Token (OFT) bridge using Foundry only — no
Hardhat CLI required. On Sepolia a standard `OFT` (ERC-20) is deployed; on
Hedera a native HTS token is created and managed by the `HTSConnector` contract
(extends `OFTCore`, burn/mint via the HTS precompile).

### What ships

| Piece | Purpose |
| --- | --- |
| `contracts/layerzero/MyOFT.sol` | Standard ERC-20 OFT for Sepolia; inherits `@layerzerolabs OFT`. |
| `contracts/layerzero/hts/HTSConnector.sol` | Abstract OFT that creates a native HTS token in its constructor and routes debit/credit through HTS burn/mint. |
| `contracts/layerzero/hts/MyHTSConnectorOFT.sol` | Concrete deploy target for Hedera — thin wrapper over `HTSConnector`. |
| `contracts/hedera/*.sol` | Generic Hedera HTS primitives shared by all bridges. |
| `script/layerzero/HelperConfig.s.sol` | Per-chain LayerZero addresses: endpoint, SendUln302, ReceiveUln302, executor, DVN, EID. |
| `script/layerzero/DeployOFT.s.sol` | Deploys the correct contract for the current chain (branches on `block.chainid`). |
| `script/layerzero/WireOApp.s.sol` | Wires one side: `setPeer` + send/receive lib + `setConfig` (ULN + Executor) + `setEnforcedOptions`. |
| `script/layerzero/SendOFT.s.sol` | Forge-driven Sepolia → Hedera token send (quotes fee, calls `oft.send`). |
| `script/layerzero/bridge.sh` | Full orchestrator — deploys both chains, wires, bridges. |

### LayerZero V2 deployed addresses

#### Sepolia Testnet (EID `40161`)

| Role | Address |
| --- | --- |
| EndpointV2 | `0x6EDCE65403992e310A62460808c4b910D972f10f` |
| SendUln302 | `0xcc1ae8Cf5D3904Cef3360A9532B477529b177cCE` |
| ReceiveUln302 | `0xdAf00F5eE2158dD58E0d3857851c432E34A3A851` |
| Executor | `0x718B92b5CB0a5552039B593faF724D182A881eDA` |
| DVN (LayerZero Labs) | `0x8eEbF8b423B73bFCa51a1Db4B7354AA0bFCA9193` |

#### Hedera Testnet (EID `40285`)

| Role | Address |
| --- | --- |
| EndpointV2 | `0xbD672D1562Dd32C23B563C989d8140122483631d` |
| SendUln302 | `0x1707575f7cecdc0ad53fde9ba9bda3ed5d4440f4` |
| ReceiveUln302 | `0xc0c34919A04d69415EF2637A3Db5D637a7126cd0` |
| Executor | `0xe514D331c54d7339108045bF4794F8d71cad110e` |
| DVN (LayerZero Labs) | `0xEc7eE1f9E9060e08dF969DC08EE72674Afd5E14D` |

### Run the full round-trip

Requires a Foundry keystore funded with ~20 HBAR (Hedera) and ~0.1 ETH (Sepolia).

```bash
cd packages/foundry

export SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/<KEY>"
export ACCOUNT="my-foundry-keystore"                    # cast wallet alias
export DIRECTION="hedera-to-sepolia"                    # or sepolia-to-hedera

yarn lz:bridge                                          # runs script/layerzero/bridge.sh
```

The script:

1. Deploys `MyOFT` on Sepolia and `MyHTSConnectorOFT` on Hedera.
2. Wires both OApps with `WireOApp.s.sol` (peer + send/receive libs + DVN config + enforced options).
3. Bridges `$AMOUNT` tokens in the chosen direction.

Track the message on [testnet.layerzeroscan.com](https://testnet.layerzeroscan.com).

### Knobs (all env-overridable)

| Variable | Default | Meaning |
| --- | --- | --- |
| `NAME` / `SYMBOL` | `BridgeToken` / `BTK` | Token metadata. |
| `PREMINT_SEPOLIA` | `1_000_000_000_000_000_000` (1 token @ 18dp) | Initial mint on Sepolia. |
| `AMOUNT` | `100_000_000_000_000_000` (0.1 token @ 18dp) | Amount to bridge. |
| `DIRECTION` | `hedera-to-sepolia` | Bridge direction. |

### Token model

- Both `MyOFT` (Sepolia) and `MyHTSConnectorOFT` (Hedera) use **18 decimals**.
- The HTS token is created with **infinite supply** (`finiteTotalSupplyType = false`) and **zero initial supply**. Tokens are minted when a message is received from Sepolia and burned when a message is sent to Sepolia.
- **Per-send hard cap**: HTS balances are stored as `int64`. At 18 decimals the maximum value of a single transfer is `int64.max / 1e18 ≈ 9.22 tokens`. Keep individual send amounts below this ceiling.
- **Approval required before send (Hedera → Sepolia)**: before calling `send` on the connector, the sender must call `approve(connectorAddress, amount)` on the HTS token (`token()` returns its address). The `bridge.sh` script handles this automatically.

### Hedera-specific pitfalls

- **Token creation fee**: the `MyHTSConnectorOFT` constructor is called with
  `value: 20 ether` in the deploy script. Hedera's JSON-RPC relay divides the
  transaction value by `10^10` before the EVM sees it, so the contract receives
  ~20 HBAR — enough to cover the HTS precompile token-creation fee (~15 HBAR).
- **Tinybar / wei mismatch on send**: when using `cast send` to bridge from
  Hedera the quoted fee is in tinybar. The shell script multiplies by `10^10`
  before passing `--value` to align with what the relay rescales back. See
  `script/ccip/HEDERA_NATIVE_FEE_NOTES.md` for the full explanation.
- **`--legacy` flag**: all Hedera `forge script` and `cast send` calls use
  `--legacy` because HashIO does not reliably support EIP-1559 transactions.
