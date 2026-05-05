#!/usr/bin/env bash
# cwd = packages/foundry

set -euo pipefail

if [[ -f .env ]]; then
	set -a
	# shellcheck disable=SC1091
	source .env
	set +a
fi

ACCOUNT="${ACCOUNT:?set ACCOUNT in .env}"

HEDERA_RPC_ALIAS="${HEDERA_RPC_ALIAS:-hedera_testnet}"
CCIP_TOKEN_NAME="${CCIP_TOKEN_NAME:-BestToken}"
CCIP_TOKEN_SYMBOL="${CCIP_TOKEN_SYMBOL:-BTK}"
CCIP_TOKEN_DECIMALS="${CCIP_TOKEN_DECIMALS:-8}"
CCIP_PREMINT_HEDERA_HTS="${CCIP_PREMINT_HEDERA_HTS:-0}"
CCIP_HEDERA_HTS_CREATE_VALUE="${CCIP_HEDERA_HTS_CREATE_VALUE:-20ether}"

HEDERA_DEPLOY_GAS_LIMIT="${HEDERA_DEPLOY_GAS_LIMIT:-15000000}"
HEDERA_TRANSFER_GAS_LIMIT="${HEDERA_TRANSFER_GAS_LIMIT:-15000000}"

HEDERA_ROUTER="${HEDERA_ROUTER:-0x802C5F84eAD128Ff36fD6a3f8a418e339f467Ce4}"
HEDERA_RMN_PROXY="${HEDERA_RMN_PROXY:-0x0Df355104424BABfb2404600A4258CfE140a78Cf}"
HEDERA_TOKEN_ADMIN_REGISTRY="${HEDERA_TOKEN_ADMIN_REGISTRY:-0xA6643e4f53ceABad16970e8592D4eF7fea49260a}"
HEDERA_REGISTRY_MODULE_OWNER_CUSTOM="${HEDERA_REGISTRY_MODULE_OWNER_CUSTOM:-0xf76cE612250eeEb8889F49FBCB11f1c2705305F6}"

HEDERA_GAS_PRICE=$(cast gas-price --rpc-url "${HEDERA_RPC_ALIAS}")

echo "[CCIP HTS] Hedera gas price: ${HEDERA_GAS_PRICE} wei"

echo "[CCIP HTS] Deploying wrapper and creating native HTS token..."
CCIP_HEDERA_WRAPPER=$(forge create contracts/ccip/HTSBurnMintERC20.sol:HTSBurnMintERC20 \
	--rpc-url "${HEDERA_RPC_ALIAS}" \
	--account "${ACCOUNT}" \
	--broadcast \
	--legacy \
	--optimize \
	--optimizer-runs 200 \
	--value "${CCIP_HEDERA_HTS_CREATE_VALUE}" \
	--gas-price "${HEDERA_GAS_PRICE}" \
	--gas-limit "${HEDERA_DEPLOY_GAS_LIMIT}" \
	--constructor-args "${CCIP_TOKEN_NAME}" "${CCIP_TOKEN_SYMBOL}" "${CCIP_TOKEN_DECIMALS}" "${CCIP_PREMINT_HEDERA_HTS}" \
	| awk '/Deployed to:/ {print $3}')
echo "[CCIP HTS] Wrapper: ${CCIP_HEDERA_WRAPPER}"

CCIP_HEDERA_HTS_TOKEN=$(cast call "${CCIP_HEDERA_WRAPPER}" \
	"htsTokenAddress()(address)" \
	--rpc-url "${HEDERA_RPC_ALIAS}")
echo "[CCIP HTS] Native HTS token: ${CCIP_HEDERA_HTS_TOKEN}"

echo "[CCIP HTS] Deploying HTS-aware BurnMintTokenPool..."
CCIP_HEDERA_POOL=$(forge create contracts/ccip/HtsBurnMintTokenPool.sol:HtsBurnMintTokenPool \
	--rpc-url "${HEDERA_RPC_ALIAS}" \
	--account "${ACCOUNT}" \
	--broadcast \
	--legacy \
	--optimize \
	--optimizer-runs 200 \
	--gas-price "${HEDERA_GAS_PRICE}" \
	--gas-limit "${HEDERA_DEPLOY_GAS_LIMIT}" \
	--constructor-args "${CCIP_HEDERA_WRAPPER}" "${CCIP_TOKEN_DECIMALS}" "[]" "${HEDERA_RMN_PROXY}" "${HEDERA_ROUTER}" \
	| awk '/Deployed to:/ {print $3}')
echo "[CCIP HTS] Pool: ${CCIP_HEDERA_POOL}"

echo "[CCIP HTS] Initializing pool association and wrapper approval..."
cast send "${CCIP_HEDERA_POOL}" \
	"initializeHtsPool()" \
	--rpc-url "${HEDERA_RPC_ALIAS}" \
	--account "${ACCOUNT}" \
	--legacy \
	--gas-price "${HEDERA_GAS_PRICE}" \
	--gas-limit "${HEDERA_TRANSFER_GAS_LIMIT}"

echo "[CCIP HTS] Granting mint/burn roles to pool..."
cast send "${CCIP_HEDERA_WRAPPER}" \
	"grantMintAndBurnRoles(address)" "${CCIP_HEDERA_POOL}" \
	--rpc-url "${HEDERA_RPC_ALIAS}" \
	--account "${ACCOUNT}" \
	--legacy \
	--gas-price "${HEDERA_GAS_PRICE}" \
	--gas-limit "${HEDERA_TRANSFER_GAS_LIMIT}"

echo "[CCIP HTS] Registering wrapper with CCIP admin registry..."
cast send "${HEDERA_REGISTRY_MODULE_OWNER_CUSTOM}" \
	"registerAdminViaGetCCIPAdmin(address)" "${CCIP_HEDERA_WRAPPER}" \
	--rpc-url "${HEDERA_RPC_ALIAS}" \
	--account "${ACCOUNT}" \
	--legacy \
	--gas-price "${HEDERA_GAS_PRICE}" \
	--gas-limit "${HEDERA_TRANSFER_GAS_LIMIT}"

cast send "${HEDERA_TOKEN_ADMIN_REGISTRY}" \
	"acceptAdminRole(address)" "${CCIP_HEDERA_WRAPPER}" \
	--rpc-url "${HEDERA_RPC_ALIAS}" \
	--account "${ACCOUNT}" \
	--legacy \
	--gas-price "${HEDERA_GAS_PRICE}" \
	--gas-limit "${HEDERA_TRANSFER_GAS_LIMIT}"

cast send "${HEDERA_TOKEN_ADMIN_REGISTRY}" \
	"setPool(address,address)" "${CCIP_HEDERA_WRAPPER}" "${CCIP_HEDERA_POOL}" \
	--rpc-url "${HEDERA_RPC_ALIAS}" \
	--account "${ACCOUNT}" \
	--legacy \
	--gas-price "${HEDERA_GAS_PRICE}" \
	--gas-limit "${HEDERA_TRANSFER_GAS_LIMIT}"

echo "[CCIP HTS] Deploy complete"
echo "CCIP_HEDERA_TOKEN=${CCIP_HEDERA_WRAPPER}"
echo "CCIP_HEDERA_WRAPPER=${CCIP_HEDERA_WRAPPER}"
echo "CCIP_HEDERA_POOL=${CCIP_HEDERA_POOL}"
echo "CCIP_HEDERA_HTS_TOKEN=${CCIP_HEDERA_HTS_TOKEN}"
