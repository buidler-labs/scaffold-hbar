#!/usr/bin/env bash
# cwd = packages/foundry

set -euo pipefail

if [[ -f .env ]]; then
	set -a
	# shellcheck disable=SC1091
	source .env
	set +a
fi

if [[ -f scripts-js/syncBridgeConfig.js ]]; then
	eval "$(node scripts-js/syncBridgeConfig.js env axelar)"
fi

# Token defaults
TOKEN_NAME="${AXELAR_TOKEN_NAME:-BridgeToken}"
TOKEN_SYMBOL="${AXELAR_TOKEN_SYMBOL:-BTK}"
AXELAR_INITIAL_SUPPLY="${AXELAR_INITIAL_SUPPLY:-1000000000000000000}"
SEPOLIA_DEV_MINTER="${SEPOLIA_DEV_MINTER:-0x0000000000000000000000000000000000000000}"
HEDERA_INITIAL_SUPPLY="${HEDERA_INITIAL_SUPPLY:-1000000000000000000}"

# Hedera transaction settings
HEDERA_DEPLOY_GAS_LIMIT="${HEDERA_DEPLOY_GAS_LIMIT:-15000000}"
HEDERA_TRANSFER_GAS_LIMIT="${HEDERA_TRANSFER_GAS_LIMIT:-${HEDERA_DEPLOY_GAS_LIMIT}}"

# Axelar ITS contracts and fees
INTERCHAIN_TOKEN_SERVICE="${INTERCHAIN_TOKEN_SERVICE:-0xB5FB4BE02232B1bBA4dC8f81dc24C26980dE9e3C}"
INTERCHAIN_TOKEN_FACTORY="${INTERCHAIN_TOKEN_FACTORY:-0x83a93500d23Fbc3e82B410aD07A6a9F7A0670D66}"
GAS_VALUE_ITS="${GAS_VALUE_ITS:-0.0001ether}"
NATIVE_FEE_ITS="${NATIVE_FEE_ITS:-0.001ether}"

# Hedera metadata registration uses direct cast send and usually no ITS fee.
HEDERA_METADATA_GAS_VALUE_ITS="${HEDERA_METADATA_GAS_VALUE_ITS:-0}"
HEDERA_METADATA_NATIVE_FEE_ITS="${HEDERA_METADATA_NATIVE_FEE_ITS:-0}"

# Hedera source-chain transfers need Hedera-aware native value scaling.
# gasValue is passed through Axelar ITS/GasService as tinybar-style units, while
# JSON-RPC msg.value is 18-decimal wei-style HBAR.
HEDERA_SEND_GAS_VALUE_ITS="${HEDERA_SEND_GAS_VALUE_ITS:-100000000}" # 1 HBAR in tinybar units
HEDERA_SEND_NATIVE_FEE_ITS="${HEDERA_SEND_NATIVE_FEE_ITS:-1000000000000000000}" # 1 HBAR in wei-style units

# Token manager and remote link defaults
LOCK_UNLOCK_TYPE="${LOCK_UNLOCK_TYPE:-2}"
MINT_BURN_TYPE="${MINT_BURN_TYPE:-4}"
HEDERA_LINK_DESTINATION_CHAIN="${HEDERA_LINK_DESTINATION_CHAIN:-hedera}"
HEDERA_LINK_DESTINATION_MANAGER_TYPE="${HEDERA_LINK_DESTINATION_MANAGER_TYPE:-${LOCK_UNLOCK_TYPE}}"

ensure_eoa() {
	[[ -n "${EOA:-}" ]] || EOA=$(cast wallet address --account "${ACCOUNT:?set ACCOUNT or EOA in .env}")
}

ensure_amount() {
	[[ -n "${AMOUNT:-}" ]] || { echo "[AXELAR] AMOUNT is required" >&2; exit 1; }
}

record_bridge_state() {
	node scripts-js/syncBridgeConfig.js record axelar "$@"
}

deploy_sepolia() {
	ensure_eoa
	echo "[AXELAR] Deploying ${TOKEN_NAME} ${TOKEN_SYMBOL} on Sepolia"
	local output_file
	output_file=$(mktemp)
	forge script script/axelar/DeployBridgeTokens.s.sol:DeployBridgeTokens \
		--rpc-url sepolia --account "${ACCOUNT}" --broadcast -vvv \
		--sender "${EOA}" --chain-id 11155111 \
		--sig "run(string,string,address,uint256,address)" \
		"${TOKEN_NAME}" "${TOKEN_SYMBOL}" "${EOA}" "${AXELAR_INITIAL_SUPPLY}" "${SEPOLIA_DEV_MINTER}" | tee "${output_file}"
	local bridge_token
	bridge_token=$(awk '/BridgeToken:/ {print $2}' "${output_file}" | tail -1)
	rm -f "${output_file}"
	[[ -n "${bridge_token}" ]] && record_bridge_state sepolia bridgeToken="${bridge_token}"
}

verify_sepolia() {
	local deployed=$1
	ensure_eoa
	echo "[AXELAR] Verifying Token on Sepolia"
	ARGS=$(cast abi-encode "constructor(string,string,address,uint256,address)" \
		"${TOKEN_NAME}" "${TOKEN_SYMBOL}" "${EOA}" "${AXELAR_INITIAL_SUPPLY}" "${SEPOLIA_DEV_MINTER}")
	forge verify-contract "${deployed}" contracts/axelar/BridgeToken.sol:BridgeToken \
		--chain sepolia \
		--etherscan-api-key "${ETHERSCAN_API_KEY}" \
		--constructor-args "${ARGS}"
}

deploy_hedera() {
	ensure_eoa
	echo "[AXELAR] Deploying ${TOKEN_NAME} ${TOKEN_SYMBOL} on Hedera"
	HEDERA_GAS_PRICE=$(cast gas-price --rpc-url hedera_testnet)
	echo "[AXELAR] Hedera gas price: $HEDERA_GAS_PRICE wei"
	local output_file
	output_file=$(mktemp)
	forge create contracts/axelar/MyBridgeHtsToken.sol:MyBridgeHtsToken \
		--rpc-url hedera_testnet \
		--value "${HEDERA_HTS_CREATE_VALUE:-20ether}" \
		--gas-price "${HEDERA_GAS_PRICE_WEI:-${HEDERA_GAS_PRICE}}" \
		--gas-limit "${HEDERA_DEPLOY_GAS_LIMIT}" \
		--account "${ACCOUNT}" \
		--legacy --broadcast \
		--constructor-args "${TOKEN_NAME}" "${TOKEN_SYMBOL}" "${EOA}" "${HEDERA_INITIAL_SUPPLY}" | tee "${output_file}"
	local wrapper
	wrapper=$(awk '/Deployed to:/ {print $3}' "${output_file}" | tail -1)
	rm -f "${output_file}"
	if [[ -n "${wrapper}" ]]; then
		local hts_token
		hts_token=$(cast call "${wrapper}" "token()(address)" --rpc-url hedera_testnet)
		record_bridge_state hedera wrapper="${wrapper}" bridgeToken="${hts_token}" gasLimit="${HEDERA_DEPLOY_GAS_LIMIT}"
	fi
}

verify_hedera() {
	local deployed=$1
	echo "[AXELAR] Verifying Token on Hedera"
	node scripts-js/verifyHederaContract.js MyBridgeHtsToken testnet "${deployed}"
}

metadata_sepolia() {
	ensure_eoa
	echo "[AXELAR] Register Token Metadata on Sepolia"
	forge script script/axelar/RegisterTokenMetadata.s.sol:RegisterTokenMetadata \
		--rpc-url sepolia --account "${ACCOUNT}" --broadcast -vvv \
		--sender "${EOA}" --chain-id 11155111 \
		--sig "run(address,uint256,uint256)" "${SEPOLIA_BRIDGE_TOKEN}" "${GAS_VALUE_ITS}" "${NATIVE_FEE_ITS}"
}

metadata_hedera() {
	echo "[AXELAR] Register Token Metadata on Hedera"
	HEDERA_GAS_PRICE=$(cast gas-price --rpc-url hedera_testnet)
	cast send "${INTERCHAIN_TOKEN_SERVICE}" \
		"registerTokenMetadata(address,uint256)" "${HEDERA_BRIDGE_TOKEN}" "${HEDERA_METADATA_GAS_VALUE_ITS}" \
		--value "${HEDERA_METADATA_NATIVE_FEE_ITS}" \
		--rpc-url hedera_testnet \
		--gas-price "${HEDERA_GAS_PRICE_WEI:-${HEDERA_GAS_PRICE}}" \
		--gas-limit "${HEDERA_DEPLOY_GAS_LIMIT}" \
		--account "${ACCOUNT}" \
		--legacy
}

register_custom() {
	ensure_eoa
	echo "[AXELAR] Register Custom Token on Sepolia"
	local salt_override="${SALT:-0x0000000000000000000000000000000000000000000000000000000000000000}"
	forge script script/axelar/RegisterCustomToken.s.sol:RegisterCustomToken \
		--rpc-url sepolia --account "${ACCOUNT}" --broadcast -vvv \
		--sender "${EOA}" --chain-id 11155111 \
		--sig "run(address,uint8,address,uint256,bytes32)" "${SEPOLIA_BRIDGE_TOKEN}" "${MINT_BURN_TYPE}" "${EOA}" "${NATIVE_FEE_ITS}" "${salt_override}"
	if [[ -f script/axelar/.tokenid ]]; then
		local token_id
		token_id="$(tr -d '[:space:]' < script/axelar/.tokenid)"
		local salt
		salt="$(tr -d '[:space:]' < script/axelar/.salt)"
		record_bridge_state route tokenId="${token_id}" salt="${salt}" interchainTokenService="${INTERCHAIN_TOKEN_SERVICE}" gasValue="${GAS_VALUE_ITS}" nativeFee="${NATIVE_FEE_ITS}" hederaGasValue="${HEDERA_SEND_GAS_VALUE_ITS}" hederaNativeFee="${HEDERA_SEND_NATIVE_FEE_ITS}"
	fi
}

link_remote() {
	ensure_eoa
	if [[ -f script/axelar/.salt ]]; then
		SALT="$(tr -d '[:space:]' < script/axelar/.salt)"
	fi
	[[ -n "${SALT:-}" ]] || { echo "[AXELAR] SALT is required; run register-custom first or set SALT" >&2; exit 1; }
	forge script script/axelar/LinkRemoteToken.s.sol:LinkRemoteToken \
		--rpc-url sepolia --account "${ACCOUNT}" --broadcast -vvv \
		--sender "${EOA}" --chain-id 11155111 \
		--sig "run(bytes32,string,address,uint8,bytes,uint256,uint256)" \
		"${SALT}" "${HEDERA_LINK_DESTINATION_CHAIN}" "${HEDERA_BRIDGE_TOKEN}" "${HEDERA_LINK_DESTINATION_MANAGER_TYPE}" "0x" "${GAS_VALUE_ITS}" "${NATIVE_FEE_ITS}"
}

transfer_mintership_sepolia() {
	ensure_eoa
	echo "[AXELAR] Transfer Sepolia token mintership to Token Manager"
	forge script script/axelar/TransferMintership.s.sol:TransferMintership \
		--rpc-url sepolia --account "${ACCOUNT}" --broadcast -vvv \
		--sender "${EOA}" --chain-id 11155111 \
		--sig "run(bytes32,address)" \
		0x0000000000000000000000000000000000000000000000000000000000000000 \
		"${SEPOLIA_BRIDGE_TOKEN}"
}

send_from_sepolia() {
	ensure_eoa
	ensure_amount
	local recipient="${RECIPIENT:-${EOA}}"
	echo "[AXELAR] Send interchain transfer Sepolia -> Hedera"
	forge script script/axelar/SendInterchainTransfer.s.sol:SendInterchainTransfer \
		--rpc-url sepolia --account "${ACCOUNT}" --broadcast -vvv \
		--sender "${EOA}" --chain-id 11155111 \
		--sig "run(bytes32,string,address,uint256,uint256,uint256)" \
		0x0000000000000000000000000000000000000000000000000000000000000000 \
		"hedera" "${recipient}" "${AMOUNT}" "${GAS_VALUE_ITS}" "${NATIVE_FEE_ITS}"
}

approve_hedera() {
	ensure_amount
	echo "[AXELAR] Approve Hedera HTS token for ITS lock/unlock"
	HEDERA_GAS_PRICE=$(cast gas-price --rpc-url hedera_testnet)
	cast send "${HEDERA_BRIDGE_TOKEN}" \
		"approve(address,uint256)" "${INTERCHAIN_TOKEN_SERVICE}" "${AMOUNT}" \
		--rpc-url hedera_testnet \
		--gas-price "${HEDERA_GAS_PRICE_WEI:-${HEDERA_GAS_PRICE}}" \
		--gas-limit "${HEDERA_TRANSFER_GAS_LIMIT}" \
		--account "${ACCOUNT}" \
		--legacy
}

send_from_hedera() {
	ensure_eoa
	ensure_amount
	local recipient="${RECIPIENT:-${EOA}}"
	echo "[AXELAR] Send interchain transfer Hedera -> Sepolia"
	if [[ -f script/axelar/.tokenid ]]; then
		TOKEN_ID="$(tr -d '[:space:]' < script/axelar/.tokenid)"
	fi
	[[ -n "${TOKEN_ID:-}" ]] || { echo "[AXELAR] TOKEN_ID is required; run register-custom first or set TOKEN_ID" >&2; exit 1; }
	HEDERA_GAS_PRICE=$(cast gas-price --rpc-url hedera_testnet)
	cast send "${INTERCHAIN_TOKEN_SERVICE}" \
		"interchainTransfer(bytes32,string,bytes,uint256,bytes,uint256)" \
		"${TOKEN_ID}" \
		"ethereum-sepolia" \
		"${recipient}" \
		"${AMOUNT}" \
		"0x" \
		"${HEDERA_SEND_GAS_VALUE_ITS}" \
		--value "${HEDERA_SEND_NATIVE_FEE_ITS}" \
		--rpc-url hedera_testnet \
		--gas-price "${HEDERA_GAS_PRICE_WEI:-${HEDERA_GAS_PRICE}}" \
		--gas-limit "${HEDERA_TRANSFER_GAS_LIMIT}" \
		--account "${ACCOUNT}" \
		--legacy
}

case "${1:-}" in
deploy-sepolia) deploy_sepolia ;;
deploy-hedera) deploy_hedera ;;
verify-sepolia) verify_sepolia "${2:-}" ;;
verify-hedera) verify_hedera "${2:-}" ;;
metadata-sepolia) metadata_sepolia ;;
metadata-hedera) metadata_hedera ;;
register-custom) register_custom ;;
link-remote) link_remote ;;
transfer-mintership-sepolia) transfer_mintership_sepolia ;;
approve-hedera) approve_hedera ;;
send-from-sepolia) send_from_sepolia ;;
send-from-hedera) send_from_hedera ;;
"")
	echo "usage: $0 deploy-sepolia | deploy-hedera | verify-sepolia <addr> | verify-hedera <addr> | metadata-sepolia | metadata-hedera | register-custom | link-remote | transfer-mintership-sepolia | approve-hedera | send-from-sepolia | send-from-hedera" >&2
	exit 1
	;;
*)
	echo "unknown step: $1" >&2
	exit 1
	;;
esac
echo "DONE: $1 ${2:-}"
