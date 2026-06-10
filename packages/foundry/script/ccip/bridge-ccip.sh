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
	eval "$(node scripts-js/syncBridgeConfig.js env ccip)"
fi

# Chain aliases from foundry.toml
SEPOLIA_RPC_ALIAS="${SEPOLIA_RPC_ALIAS:-sepolia}"
HEDERA_RPC_ALIAS="${HEDERA_RPC_ALIAS:-hedera_testnet}"

# Token defaults for the vanilla Chainlink CCT Burn & Mint tutorial flow.
CCIP_TOKEN_NAME="${CCIP_TOKEN_NAME:-BestToken}"
CCIP_TOKEN_SYMBOL="${CCIP_TOKEN_SYMBOL:-BTK}"
CCIP_TOKEN_DECIMALS="${CCIP_TOKEN_DECIMALS:-8}"
CCIP_PREMINT_SEPOLIA="${CCIP_PREMINT_SEPOLIA:-10000000000}" # 100 tokens @ 8 decimals
CCIP_PREMINT_HEDERA="${CCIP_PREMINT_HEDERA:-10000000000}"
CCIP_PREMINT_HEDERA_HTS="${CCIP_PREMINT_HEDERA_HTS:-0}"
CCIP_HEDERA_HTS_CREATE_VALUE="${CCIP_HEDERA_HTS_CREATE_VALUE:-20ether}"
HEDERA_DEPLOY_GAS_LIMIT="${HEDERA_DEPLOY_GAS_LIMIT:-15000000}"
HEDERA_TRANSFER_GAS_LIMIT="${HEDERA_TRANSFER_GAS_LIMIT:-15000000}"

# CCIP chain selectors and routers.
SEPOLIA_CHAIN_SELECTOR="16015286601757825753"
HEDERA_CHAIN_SELECTOR="222782988166878823"
SEPOLIA_ROUTER="0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59"
HEDERA_ROUTER="0x802C5F84eAD128Ff36fD6a3f8a418e339f467Ce4"
HEDERA_RMN_PROXY="0x0Df355104424BABfb2404600A4258CfE140a78Cf"
HEDERA_TOKEN_ADMIN_REGISTRY="0xA6643e4f53ceABad16970e8592D4eF7fea49260a"
HEDERA_REGISTRY_MODULE_OWNER_CUSTOM="0xf76cE612250eeEb8889F49FBCB11f1c2705305F6"
HEDERA_HTS_PRECOMPILE="0x0000000000000000000000000000000000000167"
CCIP_HEDERA_FEE_BUFFER_BPS="${CCIP_HEDERA_FEE_BUFFER_BPS:-12500}"

require_env() {
	local name="$1"
	if [[ -z "${!name:-}" ]]; then
		echo "[CCIP] ${name} is required" >&2
		exit 1
	fi
}

ensure_account() {
	require_env ACCOUNT
}

ensure_eoa() {
	ensure_account
	[[ -n "${EOA:-}" ]] || EOA=$(cast wallet address --account "${ACCOUNT}")
}

ensure_amount() {
	[[ -n "${AMOUNT:-}" ]] || AMOUNT="1000000000"
}

hedera_ccip_value_from_fee() {
	node -e 'const fee = BigInt(process.argv[1]); const bps = BigInt(process.argv[2]); const bufferedTinybar = (fee * bps + 9999n) / 10000n; console.log((bufferedTinybar * 10000000000n).toString())' "$1" "${CCIP_HEDERA_FEE_BUFFER_BPS}"
}

record_bridge_state() {
	node scripts-js/syncBridgeConfig.js record ccip "$@"
}

deploy_sepolia() {
	ensure_account
	echo "[CCIP] Deploying ${CCIP_TOKEN_NAME} ${CCIP_TOKEN_SYMBOL} on Sepolia"
	local output_file
	output_file=$(mktemp)
	forge script script/ccip/TokenAndPoolDeployer.s.sol:TokenAndPoolDeployer \
		--rpc-url "${SEPOLIA_RPC_ALIAS}" --account "${ACCOUNT}" --broadcast \
		--sig "run(string,string,uint8,uint256)" \
		"${CCIP_TOKEN_NAME}" "${CCIP_TOKEN_SYMBOL}" "${CCIP_TOKEN_DECIMALS}" "${CCIP_PREMINT_SEPOLIA}" | tee "${output_file}"
	local token
	local pool
	token=$(awk '/CCIP_TOKEN=/ {sub(/.*CCIP_TOKEN= ?/, ""); print $1}' "${output_file}" | tail -1)
	pool=$(awk '/CCIP_POOL=/ {sub(/.*CCIP_POOL= ?/, ""); print $1}' "${output_file}" | tail -1)
	rm -f "${output_file}"
	[[ -n "${token}" && -n "${pool}" ]] && record_bridge_state sepolia token="${token}" pool="${pool}"
	echo "[CCIP] Recorded Sepolia Token and Pool for bridge-sync-next."
}

deploy_hedera() {
	ensure_account
	echo "[CCIP] Deploying ${CCIP_TOKEN_NAME} ${CCIP_TOKEN_SYMBOL} on Hedera"
	local output_file
	output_file=$(mktemp)
	forge script script/ccip/TokenAndPoolDeployer.s.sol:TokenAndPoolDeployer \
		--rpc-url "${HEDERA_RPC_ALIAS}" --account "${ACCOUNT}" --broadcast --slow --legacy \
		--sig "run(string,string,uint8,uint256)" \
		"${CCIP_TOKEN_NAME}" "${CCIP_TOKEN_SYMBOL}" "${CCIP_TOKEN_DECIMALS}" "${CCIP_PREMINT_HEDERA}" | tee "${output_file}"
	local token
	local pool
	token=$(awk '/CCIP_TOKEN=/ {sub(/.*CCIP_TOKEN= ?/, ""); print $1}' "${output_file}" | tail -1)
	pool=$(awk '/CCIP_POOL=/ {sub(/.*CCIP_POOL= ?/, ""); print $1}' "${output_file}" | tail -1)
	rm -f "${output_file}"
	[[ -n "${token}" && -n "${pool}" ]] && record_bridge_state hedera token="${token}" pool="${pool}"
	echo "[CCIP] Recorded Hedera Token and Pool for bridge-sync-next."
}

deploy_hedera_hts() {
	bash script/ccip/deploy-hedera-hts.sh
}

configure_sepolia() {
	ensure_account
	require_env CCIP_SEPOLIA_POOL
	require_env CCIP_HEDERA_POOL
	require_env CCIP_HEDERA_TOKEN
	echo "[CCIP] Configuring Sepolia pool for Hedera"
	forge script script/ccip/ConfigurePool.s.sol:ConfigurePool \
		--rpc-url "${SEPOLIA_RPC_ALIAS}" --account "${ACCOUNT}" --broadcast \
		--sig "run(address,uint64,address,address,bool,uint128,uint128,bool,uint128,uint128)" \
		"${CCIP_SEPOLIA_POOL}" "${HEDERA_CHAIN_SELECTOR}" "${CCIP_HEDERA_POOL}" "${CCIP_HEDERA_TOKEN}" \
		false 0 0 false 0 0
}

configure_hedera() {
	ensure_account
	require_env CCIP_HEDERA_POOL
	require_env CCIP_SEPOLIA_POOL
	require_env CCIP_SEPOLIA_TOKEN
	echo "[CCIP] Configuring Hedera pool for Sepolia"
	forge script script/ccip/ConfigurePool.s.sol:ConfigurePool \
		--rpc-url "${HEDERA_RPC_ALIAS}" --account "${ACCOUNT}" --broadcast --slow --legacy \
		--sig "run(address,uint64,address,address,bool,uint128,uint128,bool,uint128,uint128)" \
		"${CCIP_HEDERA_POOL}" "${SEPOLIA_CHAIN_SELECTOR}" "${CCIP_SEPOLIA_POOL}" "${CCIP_SEPOLIA_TOKEN}" \
		false 0 0 false 0 0
}

send_from_sepolia() {
	ensure_eoa
	ensure_amount
	require_env CCIP_SEPOLIA_TOKEN
	local recipient="${RECIPIENT:-${EOA}}"
	echo "[CCIP] Sending ${AMOUNT} tokens Sepolia -> Hedera"
	forge script script/ccip/BridgeTokens.s.sol:BridgeTokens \
		--rpc-url "${SEPOLIA_RPC_ALIAS}" --account "${ACCOUNT}" --broadcast \
		--sig "run(address,uint64,address,uint256,address)" \
		"${recipient}" "${HEDERA_CHAIN_SELECTOR}" "${CCIP_SEPOLIA_TOKEN}" "${AMOUNT}" "${SEPOLIA_ROUTER}"
	echo "[CCIP] Track the message at https://ccip.chain.link"
}

associate_hedera() {
	ensure_eoa
	require_env CCIP_HEDERA_HTS_TOKEN
	local account="${RECIPIENT:-${EOA}}"
	echo "[CCIP] Associating ${account} with Hedera HTS token ${CCIP_HEDERA_HTS_TOKEN}"
	cast send "${HEDERA_HTS_PRECOMPILE}" "associateToken(address,address)" \
		"${account}" "${CCIP_HEDERA_HTS_TOKEN}" \
		--rpc-url "${HEDERA_RPC_ALIAS}" --account "${ACCOUNT}" --legacy
}

approve_hedera_hts() {
	ensure_account
	ensure_amount
	require_env CCIP_HEDERA_HTS_TOKEN
	require_env CCIP_HEDERA_TOKEN
	echo "[CCIP] Approving wrapper to pull native HTS token"
	echo "[CCIP] HTS token: ${CCIP_HEDERA_HTS_TOKEN}"
	echo "[CCIP] Wrapper:   ${CCIP_HEDERA_TOKEN}"
	echo "[CCIP] Amount:    ${AMOUNT}"
	cast send "${CCIP_HEDERA_HTS_TOKEN}" "approve(address,uint256)" \
		"${CCIP_HEDERA_TOKEN}" "${AMOUNT}" \
		--rpc-url "${HEDERA_RPC_ALIAS}" --account "${ACCOUNT}" --legacy
}

send_from_hedera() {
	ensure_eoa
	ensure_amount
	require_env CCIP_HEDERA_TOKEN
	local recipient="${RECIPIENT:-${EOA}}"
	echo "[CCIP] Sending ${AMOUNT} tokens Hedera -> Sepolia"
	local receiver
	receiver=$(cast abi-encode "f(address)" "${recipient}")
	local extra_args="0x181dcf1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001"
	local message="(${receiver},0x,[(${CCIP_HEDERA_TOKEN},${AMOUNT})],0x0000000000000000000000000000000000000000,${extra_args})"
	local fee
	fee=$(cast call "${HEDERA_ROUTER}" \
		"getFee(uint64,(bytes,bytes,(address,uint256)[],address,bytes))(uint256)" \
		"${SEPOLIA_CHAIN_SELECTOR}" "${message}" --rpc-url "${HEDERA_RPC_ALIAS}" | awk '{print $1}')
	local value
	value=$(hedera_ccip_value_from_fee "${fee}")
	echo "[CCIP] fee (tinybar): ${fee}"
	echo "[CCIP] fee buffer bps: ${CCIP_HEDERA_FEE_BUFFER_BPS}"
	echo "[CCIP] value (wei):   ${value}"
	echo "[CCIP] Approving Hedera router..."
	cast send "${CCIP_HEDERA_TOKEN}" "approve(address,uint256)" \
		"${HEDERA_ROUTER}" "${AMOUNT}" \
		--rpc-url "${HEDERA_RPC_ALIAS}" --account "${ACCOUNT}" --legacy
	echo "[CCIP] Sending Hedera CCIP message..."
	cast send "${HEDERA_ROUTER}" \
		"ccipSend(uint64,(bytes,bytes,(address,uint256)[],address,bytes))" \
		"${SEPOLIA_CHAIN_SELECTOR}" "${message}" \
		--value "${value}" \
		--rpc-url "${HEDERA_RPC_ALIAS}" --account "${ACCOUNT}" --legacy
	echo "[CCIP] Track the message at https://ccip.chain.link"
}

send_from_hedera_hts() {
	ensure_eoa
	ensure_amount
	require_env CCIP_HEDERA_TOKEN
	require_env CCIP_HEDERA_HTS_TOKEN
	local recipient="${RECIPIENT:-${EOA}}"
	echo "[CCIP] Sending ${AMOUNT} HTS-backed wrapper tokens Hedera -> Sepolia"
	echo "[CCIP] Native HTS token: ${CCIP_HEDERA_HTS_TOKEN}"
	echo "[CCIP] CCIP wrapper:      ${CCIP_HEDERA_TOKEN}"
	echo "[CCIP] Recipient:         ${recipient}"

	local receiver
	receiver=$(cast abi-encode "f(address)" "${recipient}")
	local extra_args="0x181dcf1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001"
	local message="(${receiver},0x,[(${CCIP_HEDERA_TOKEN},${AMOUNT})],0x0000000000000000000000000000000000000000,${extra_args})"
	local fee
	fee=$(cast call "${HEDERA_ROUTER}" \
		"getFee(uint64,(bytes,bytes,(address,uint256)[],address,bytes))(uint256)" \
		"${SEPOLIA_CHAIN_SELECTOR}" "${message}" --rpc-url "${HEDERA_RPC_ALIAS}" | awk '{print $1}')
	local value
	value=$(hedera_ccip_value_from_fee "${fee}")
	echo "[CCIP] fee (tinybar): ${fee}"
	echo "[CCIP] fee buffer bps: ${CCIP_HEDERA_FEE_BUFFER_BPS}"
	echo "[CCIP] value (wei):   ${value}"

	echo "[CCIP] Approval layer 1: native HTS token user -> wrapper"
	cast send "${CCIP_HEDERA_HTS_TOKEN}" "approve(address,uint256)" \
		"${CCIP_HEDERA_TOKEN}" "${AMOUNT}" \
		--rpc-url "${HEDERA_RPC_ALIAS}" --account "${ACCOUNT}" --legacy

	echo "[CCIP] Approval layer 2: wrapper user -> CCIP router"
	cast send "${CCIP_HEDERA_TOKEN}" "approve(address,uint256)" \
		"${HEDERA_ROUTER}" "${AMOUNT}" \
		--rpc-url "${HEDERA_RPC_ALIAS}" --account "${ACCOUNT}" --legacy

	echo "[CCIP] Sending Hedera HTS-backed CCIP message..."
	cast send "${HEDERA_ROUTER}" \
		"ccipSend(uint64,(bytes,bytes,(address,uint256)[],address,bytes))" \
		"${SEPOLIA_CHAIN_SELECTOR}" "${message}" \
		--value "${value}" \
		--rpc-url "${HEDERA_RPC_ALIAS}" --account "${ACCOUNT}" --legacy
	echo "[CCIP] Track the message at https://ccip.chain.link"
}

case "${1:-}" in
deploy-sepolia) deploy_sepolia ;;
deploy-hedera) deploy_hedera ;;
deploy-hedera-hts) deploy_hedera_hts ;;
configure-sepolia) configure_sepolia ;;
configure-hedera) configure_hedera ;;
associate-hedera) associate_hedera ;;
approve-hedera-hts) approve_hedera_hts ;;
send-from-sepolia) send_from_sepolia ;;
send-from-hedera) send_from_hedera ;;
send-from-hedera-hts) send_from_hedera_hts ;;
"")
	echo "usage: $0 deploy-sepolia | deploy-hedera | deploy-hedera-hts | configure-sepolia | configure-hedera | associate-hedera | approve-hedera-hts | send-from-sepolia | send-from-hedera | send-from-hedera-hts" >&2
	exit 1
	;;
*)
	echo "unknown step: $1" >&2
	echo "usage: $0 deploy-sepolia | deploy-hedera | deploy-hedera-hts | configure-sepolia | configure-hedera | associate-hedera | approve-hedera-hts | send-from-sepolia | send-from-hedera | send-from-hedera-hts" >&2
	exit 1
	;;
esac

echo "DONE: ${1:-help}"
