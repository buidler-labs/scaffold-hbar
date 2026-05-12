#!/usr/bin/env bash
# cwd = packages/foundry

set -euo pipefail

if [[ -f .env ]]; then
	set -a
	set +u
	# shellcheck disable=SC1091
	source .env
	set -u
	set +a
fi

if [[ -f scripts-js/syncBridgeConfig.js ]]; then
	eval "$(node scripts-js/syncBridgeConfig.js env layerzero)"
fi

SEPOLIA_CHAIN_ID=11155111
HEDERA_CHAIN_ID=296
SEPOLIA_EID=40161
HEDERA_EID=40285

SEPOLIA_RPC_ALIAS="${SEPOLIA_RPC_ALIAS:-sepolia}"
HEDERA_RPC_ALIAS="${HEDERA_RPC_ALIAS:-hedera_testnet}"

TOKEN_NAME="${LAYERZERO_TOKEN_NAME:-BridgeToken}"
TOKEN_SYMBOL="${LAYERZERO_TOKEN_SYMBOL:-BTK}"
PREMINT_SEPOLIA="${LAYERZERO_PREMINT_SEPOLIA:-1000000000000000000}"
AMOUNT="${AMOUNT:-100000000000000000}"
RECIPIENT="${RECIPIENT:-}"
DIRECTION="${DIRECTION:-sepolia-to-hedera}"
TX="${TX:-}"

HEDERA_ENDPOINT="0xbD672D1562Dd32C23B563C989d8140122483631d"
SEPOLIA_RECEIVE_ULN302="0xdAf00F5eE2158dD58E0d3857851c432E34A3A851"
HEDERA_RECEIVE_ULN302="0xc0c34919A04d69415EF2637A3Db5D637a7126cd0"
HEDERA_DEPLOY_GAS_LIMIT="${HEDERA_DEPLOY_GAS_LIMIT:-15000000}"
HEDERA_TRANSFER_GAS_LIMIT="${HEDERA_TRANSFER_GAS_LIMIT:-${HEDERA_DEPLOY_GAS_LIMIT}}"
HEDERA_HTS_CREATE_VALUE="${HEDERA_HTS_CREATE_VALUE:-40ether}"
LAYERZERO_RELAY_LZRECEIVE_GAS="${LAYERZERO_RELAY_LZRECEIVE_GAS:-500000}"
EXTRA_OPTS="${LAYERZERO_EXTRA_OPTS:-0x}"

ensure_eoa() {
	[[ -n "${EOA:-}" ]] || EOA=$(cast wallet address --account "${ACCOUNT:?set ACCOUNT in .env}")
	[[ -n "${RECIPIENT}" ]] || RECIPIENT="${EOA}"
}

record_bridge_state() {
	node scripts-js/syncBridgeConfig.js record layerzero "$@"
}

deploy_sepolia() {
	ensure_eoa
	echo "[LAYERZERO] Deploying ${TOKEN_NAME} (${TOKEN_SYMBOL}) OFT on Sepolia"
	local output_file
	output_file=$(mktemp)
	forge script script/layerzero/DeployOFT.s.sol:DeployOFT \
		--rpc-url "${SEPOLIA_RPC_ALIAS}" \
		--account "${ACCOUNT}" \
		--sender "${EOA}" \
		--broadcast \
		--chain-id "${SEPOLIA_CHAIN_ID}" \
		--sig "run(string,string,uint256)" \
		"${TOKEN_NAME}" "${TOKEN_SYMBOL}" "${PREMINT_SEPOLIA}" | tee "${output_file}"
	local oft
	oft=$(awk '/MyOFT deployed:/ {print $3}' "${output_file}" | tail -1)
	rm -f "${output_file}"
	[[ -n "${oft}" ]] && record_bridge_state sepolia oft="${oft}"
}

deploy_hedera() {
	ensure_eoa
	echo "[LAYERZERO] Deploying ${TOKEN_NAME} (${TOKEN_SYMBOL}) HTS Connector OFT on Hedera"
	HEDERA_GAS_PRICE=$(cast gas-price --rpc-url "${HEDERA_RPC_ALIAS}")
	echo "[LAYERZERO] Hedera gas price: ${HEDERA_GAS_PRICE} wei"
	local output_file
	output_file=$(mktemp)
	forge create contracts/layerzero/hts/MyHTSConnectorOFT.sol:MyHTSConnectorOFT \
		--rpc-url "${HEDERA_RPC_ALIAS}" \
		--value "${HEDERA_HTS_CREATE_VALUE}" \
		--gas-price "${HEDERA_GAS_PRICE_WEI:-${HEDERA_GAS_PRICE}}" \
		--gas-limit "${HEDERA_DEPLOY_GAS_LIMIT}" \
		--account "${ACCOUNT}" \
		--legacy \
		--broadcast \
		--constructor-args "${TOKEN_NAME}" "${TOKEN_SYMBOL}" "${HEDERA_ENDPOINT}" "${EOA}" | tee "${output_file}"
	local oft
	oft=$(awk '/Deployed to:/ {print $3}' "${output_file}" | tail -1)
	rm -f "${output_file}"
	if [[ -n "${oft}" ]]; then
		local hts_token
		hts_token=$(cast call "${oft}" "token()(address)" --rpc-url "${HEDERA_RPC_ALIAS}")
		record_bridge_state hedera oft="${oft}" htsToken="${hts_token}" gasLimit="${HEDERA_DEPLOY_GAS_LIMIT}"
	fi
}

deploy_workers_sepolia() {
	ensure_eoa
	echo "[LAYERZERO] Deploying simple workers on Sepolia"
	local output_file
	output_file=$(mktemp)
	forge script script/layerzero/DeploySimpleWorkers.s.sol:DeploySimpleWorkers \
		--rpc-url "${SEPOLIA_RPC_ALIAS}" \
		--account "${ACCOUNT}" \
		--sender "${EOA}" \
		--broadcast \
		--chain-id "${SEPOLIA_CHAIN_ID}" | tee "${output_file}"
	local dvn
	local executor
	dvn=$(awk '/SIMPLE_WORKERS_DVN=/ {sub(/.*SIMPLE_WORKERS_DVN= ?/, ""); print $1}' "${output_file}" | tail -1)
	executor=$(awk '/SIMPLE_WORKERS_EXECUTOR=/ {sub(/.*SIMPLE_WORKERS_EXECUTOR= ?/, ""); print $1}' "${output_file}" | tail -1)
	rm -f "${output_file}"
	[[ -n "${dvn}" && -n "${executor}" ]] && record_bridge_state sepolia workersDvn="${dvn}" workersExecutor="${executor}"
}

deploy_workers_hedera() {
	ensure_eoa
	echo "[LAYERZERO] Deploying simple workers on Hedera"
	HEDERA_GAS_PRICE=$(cast gas-price --rpc-url "${HEDERA_RPC_ALIAS}")
	local output_file
	output_file=$(mktemp)
	forge script script/layerzero/DeploySimpleWorkers.s.sol:DeploySimpleWorkers \
		--rpc-url "${HEDERA_RPC_ALIAS}" \
		--account "${ACCOUNT}" \
		--sender "${EOA}" \
		--broadcast \
		--slow \
		--legacy \
		--skip-simulation \
		--gas-price "${HEDERA_GAS_PRICE_WEI:-${HEDERA_GAS_PRICE}}" \
		--chain-id "${HEDERA_CHAIN_ID}" | tee "${output_file}"
	local dvn
	local executor
	dvn=$(awk '/SIMPLE_WORKERS_DVN=/ {sub(/.*SIMPLE_WORKERS_DVN= ?/, ""); print $1}' "${output_file}" | tail -1)
	executor=$(awk '/SIMPLE_WORKERS_EXECUTOR=/ {sub(/.*SIMPLE_WORKERS_EXECUTOR= ?/, ""); print $1}' "${output_file}" | tail -1)
	rm -f "${output_file}"
	[[ -n "${dvn}" && -n "${executor}" ]] && record_bridge_state hedera workersDvn="${dvn}" workersExecutor="${executor}"
}

wire_sepolia() {
	ensure_eoa
	echo "[LAYERZERO] Wiring Sepolia -> Hedera"
	forge script script/layerzero/WireOApp.s.sol:WireOApp \
		--rpc-url "${SEPOLIA_RPC_ALIAS}" \
		--account "${ACCOUNT}" \
		--sender "${EOA}" \
		--broadcast \
		--chain-id "${SEPOLIA_CHAIN_ID}" \
		--sig "run(address,address,address,address)" \
		"${SEPOLIA_OFT:?set SEPOLIA_OFT}" \
		"${HEDERA_OFT:?set HEDERA_OFT}" \
		"${SEPOLIA_WORKERS_DVN:?set SEPOLIA_WORKERS_DVN}" \
		"${SEPOLIA_WORKERS_EXECUTOR:?set SEPOLIA_WORKERS_EXECUTOR}"
}

wire_hedera() {
	ensure_eoa
	echo "[LAYERZERO] Wiring Hedera -> Sepolia"
	HEDERA_GAS_PRICE=$(cast gas-price --rpc-url "${HEDERA_RPC_ALIAS}")
	forge script script/layerzero/WireOApp.s.sol:WireOApp \
		--rpc-url "${HEDERA_RPC_ALIAS}" \
		--account "${ACCOUNT}" \
		--sender "${EOA}" \
		--broadcast \
		--slow \
		--legacy \
		--skip-simulation \
		--gas-price "${HEDERA_GAS_PRICE_WEI:-${HEDERA_GAS_PRICE}}" \
		--chain-id "${HEDERA_CHAIN_ID}" \
		--sig "run(address,address,address,address)" \
		"${HEDERA_OFT:?set HEDERA_OFT}" \
		"${SEPOLIA_OFT:?set SEPOLIA_OFT}" \
		"${HEDERA_WORKERS_DVN:?set HEDERA_WORKERS_DVN}" \
		"${HEDERA_WORKERS_EXECUTOR:?set HEDERA_WORKERS_EXECUTOR}"
}

verify_wiring() {
	echo "[LAYERZERO] Verifying peers"
	EXPECTED_SEPOLIA_PEER=$(printf "0x%024x%s" 0 "${HEDERA_OFT#0x}")
	EXPECTED_HEDERA_PEER=$(printf "0x%024x%s" 0 "${SEPOLIA_OFT#0x}")
	ACTUAL_SEPOLIA_PEER=$(cast call "${SEPOLIA_OFT:?set SEPOLIA_OFT}" "peers(uint32)(bytes32)" "${HEDERA_EID}" --rpc-url "${SEPOLIA_RPC_ALIAS}")
	ACTUAL_HEDERA_PEER=$(cast call "${HEDERA_OFT:?set HEDERA_OFT}" "peers(uint32)(bytes32)" "${SEPOLIA_EID}" --rpc-url "${HEDERA_RPC_ALIAS}")
	echo "  sepolia peers(${HEDERA_EID}): ${ACTUAL_SEPOLIA_PEER}"
	echo "  hedera peers(${SEPOLIA_EID}): ${ACTUAL_HEDERA_PEER}"
	[[ "${ACTUAL_SEPOLIA_PEER,,}" == "${EXPECTED_SEPOLIA_PEER,,}" ]]
	[[ "${ACTUAL_HEDERA_PEER,,}" == "${EXPECTED_HEDERA_PEER,,}" ]]
	echo "[LAYERZERO] Wiring verification passed"
}

send_from_sepolia() {
	ensure_eoa
	echo "[LAYERZERO] Sending OFT Sepolia -> Hedera"
	forge script script/layerzero/SendOFT.s.sol:SendOFT \
		--rpc-url "${SEPOLIA_RPC_ALIAS}" \
		--account "${ACCOUNT}" \
		--sender "${EOA}" \
		--broadcast \
		--chain-id "${SEPOLIA_CHAIN_ID}" \
		--sig "run(address,address,uint256)" \
		"${SEPOLIA_OFT:?set SEPOLIA_OFT}" "${RECIPIENT}" "${AMOUNT}"
}

send_from_hedera() {
	ensure_eoa
	echo "[LAYERZERO] Sending OFT Hedera -> Sepolia"
	RECEIVER_BYTES32=$(cast abi-encode "f(address)" "${RECIPIENT}" | cut -c3-)
	FEE_RAW=$(cast call "${HEDERA_OFT:?set HEDERA_OFT}" \
		"quoteSend((uint32,bytes32,uint256,uint256,bytes,bytes,bytes),bool)(uint256,uint256)" \
		"(${SEPOLIA_EID},0x${RECEIVER_BYTES32},${AMOUNT},${AMOUNT},${EXTRA_OPTS},0x,0x)" false \
		--rpc-url "${HEDERA_RPC_ALIAS}" \
		--from "${EOA}")
	FEE=$(printf '%s\n' "${FEE_RAW}" | awk 'NR == 1 { print $1 }')
	VALUE=$(( FEE * 10000000000 ))
	HEDERA_GAS_PRICE=$(cast gas-price --rpc-url "${HEDERA_RPC_ALIAS}")

	cast send "${HEDERA_HTS_TOKEN:?set HEDERA_HTS_TOKEN}" \
		"approve(address,uint256)" "${HEDERA_OFT}" "${AMOUNT}" \
		--rpc-url "${HEDERA_RPC_ALIAS}" \
		--gas-price "${HEDERA_GAS_PRICE_WEI:-${HEDERA_GAS_PRICE}}" \
		--gas-limit "${HEDERA_TRANSFER_GAS_LIMIT}" \
		--account "${ACCOUNT}" \
		--legacy

	cast send "${HEDERA_OFT}" \
		"send((uint32,bytes32,uint256,uint256,bytes,bytes,bytes),(uint256,uint256),address)" \
		"(${SEPOLIA_EID},0x${RECEIVER_BYTES32},${AMOUNT},${AMOUNT},${EXTRA_OPTS},0x,0x)" "(${VALUE},0)" "${EOA}" \
		--value "${VALUE}" \
		--rpc-url "${HEDERA_RPC_ALIAS}" \
		--gas-price "${HEDERA_GAS_PRICE_WEI:-${HEDERA_GAS_PRICE}}" \
		--gas-limit "${HEDERA_TRANSFER_GAS_LIMIT}" \
		--account "${ACCOUNT}" \
		--legacy \
		--json
}

relay() {
	ensure_eoa
	echo "[LAYERZERO] Relaying ${DIRECTION} packet: ${TX:?set TX}"
	PACKET_SENT_TOPIC=$(cast keccak "PacketSent(bytes,bytes,address)")

	if [[ "${DIRECTION}" == "sepolia-to-hedera" ]]; then
		SRC_RPC="${SEPOLIA_RPC_ALIAS}"
		DST_RPC="${HEDERA_RPC_ALIAS}"
		DVN_DST="${HEDERA_WORKERS_DVN:?set HEDERA_WORKERS_DVN}"
		EXECUTOR_DST="${HEDERA_WORKERS_EXECUTOR:?set HEDERA_WORKERS_EXECUTOR}"
		RECEIVE_ULN_DST="${HEDERA_RECEIVE_ULN302}"
		HEDERA_GAS_PRICE=$(cast gas-price --rpc-url "${HEDERA_RPC_ALIAS}")
		DST_CAST_EXTRA=(--legacy --gas-price "${HEDERA_GAS_PRICE_WEI:-${HEDERA_GAS_PRICE}}")
	else
		SRC_RPC="${HEDERA_RPC_ALIAS}"
		DST_RPC="${SEPOLIA_RPC_ALIAS}"
		DVN_DST="${SEPOLIA_WORKERS_DVN:?set SEPOLIA_WORKERS_DVN}"
		EXECUTOR_DST="${SEPOLIA_WORKERS_EXECUTOR:?set SEPOLIA_WORKERS_EXECUTOR}"
		RECEIVE_ULN_DST="${SEPOLIA_RECEIVE_ULN302}"
		DST_CAST_EXTRA=()
	fi

	RECEIPT=$(cast receipt "${TX}" --rpc-url "${SRC_RPC}" --json)
	EVENT_DATA=$(printf '%s\n' "${RECEIPT}" | jq -r --arg topic "${PACKET_SENT_TOPIC}" '.logs[] | select(.topics[0] | ascii_downcase == ($topic | ascii_downcase)) | .data' | head -1)
	ENCODED_PAYLOAD=$(cast decode-event --sig "PacketSent(bytes,bytes,address)" "${EVENT_DATA}" | sed -n '1p')
	EP="${ENCODED_PAYLOAD#0x}"
	NONCE=$(cast --to-dec "0x${EP:2:16}")
	SRC_EID=$(cast --to-dec "0x${EP:18:8}")
	SENDER_B32="0x${EP:26:64}"
	DST_EID=$(cast --to-dec "0x${EP:90:8}")
	RECEIVER_B32="0x${EP:98:64}"
	GUID="0x${EP:162:64}"
	MESSAGE="0x${EP:226}"
	RECEIVER_ADDR="0x${RECEIVER_B32#0x}"
	RECEIVER_ADDR="0x${RECEIVER_ADDR: -40}"

	cast send "${DVN_DST}" "verify(bytes,uint64,uint32,bytes32,uint32,address)" \
		"${MESSAGE}" "${NONCE}" "${SRC_EID}" "${SENDER_B32}" "${DST_EID}" "${RECEIVER_ADDR}" \
		--rpc-url "${DST_RPC}" --account "${ACCOUNT}" "${DST_CAST_EXTRA[@]}"

	LZRECV_PARAM="((${SRC_EID},${SENDER_B32},${NONCE}),${RECEIVER_ADDR},${GUID},${MESSAGE},0x,${LAYERZERO_RELAY_LZRECEIVE_GAS},0)"
	cast send "${EXECUTOR_DST}" \
		"commitAndExecute(address,((uint32,bytes32,uint64),address,bytes32,bytes,bytes,uint256,uint256),(address,uint256)[])" \
		"${RECEIVE_ULN_DST}" "${LZRECV_PARAM}" "[]" \
		--rpc-url "${DST_RPC}" --account "${ACCOUNT}" "${DST_CAST_EXTRA[@]}"
}

balances() {
	ensure_eoa
	echo "[LAYERZERO] Balances for ${RECIPIENT}"
	echo "  Sepolia OFT:"
	cast call "${SEPOLIA_OFT:?set SEPOLIA_OFT}" "balanceOf(address)(uint256)" "${RECIPIENT}" --rpc-url "${SEPOLIA_RPC_ALIAS}"
	echo "  Hedera HTS token:"
	cast call "${HEDERA_HTS_TOKEN:?set HEDERA_HTS_TOKEN}" "balanceOf(address)(uint256)" "${RECIPIENT}" --rpc-url "${HEDERA_RPC_ALIAS}"
}

case "${1:-}" in
deploy-sepolia) deploy_sepolia ;;
deploy-hedera) deploy_hedera ;;
deploy-workers-sepolia) deploy_workers_sepolia ;;
deploy-workers-hedera) deploy_workers_hedera ;;
wire-sepolia) wire_sepolia ;;
wire-hedera) wire_hedera ;;
verify-wiring) verify_wiring ;;
send-from-sepolia) send_from_sepolia ;;
send-from-hedera) send_from_hedera ;;
relay) relay ;;
balances) balances ;;
"")
	echo "usage: $0 deploy-sepolia | deploy-hedera | deploy-workers-sepolia | deploy-workers-hedera | wire-sepolia | wire-hedera | verify-wiring | send-from-sepolia | send-from-hedera | relay | balances" >&2
	exit 1
	;;
*)
	echo "unknown step: $1" >&2
	exit 1
	;;
esac
echo "DONE: $1 ${2:-}"
