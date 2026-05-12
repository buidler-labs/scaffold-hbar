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
TOKEN_DECIMALS="${AXELAR_TOKEN_DECIMALS:-18}"
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
HEDERA_REMOTE_DEPLOY_GAS_VALUE_ITS="${HEDERA_REMOTE_DEPLOY_GAS_VALUE_ITS:-${HEDERA_SEND_GAS_VALUE_ITS}}"
HEDERA_REMOTE_DEPLOY_NATIVE_FEE_ITS="${HEDERA_REMOTE_DEPLOY_NATIVE_FEE_ITS:-${HEDERA_SEND_NATIVE_FEE_ITS}}"

# Token manager and remote link defaults
NATIVE_INTERCHAIN_TOKEN_TYPE="${NATIVE_INTERCHAIN_TOKEN_TYPE:-0}"
LOCK_UNLOCK_TYPE="${LOCK_UNLOCK_TYPE:-2}"
MINT_BURN_TYPE="${MINT_BURN_TYPE:-4}"
HEDERA_LINK_DESTINATION_CHAIN="${HEDERA_LINK_DESTINATION_CHAIN:-hedera}"
HEDERA_LINK_DESTINATION_MANAGER_TYPE="${HEDERA_LINK_DESTINATION_MANAGER_TYPE:-${LOCK_UNLOCK_TYPE}}"
SEPOLIA_REMOTE_DESTINATION_CHAIN="${SEPOLIA_REMOTE_DESTINATION_CHAIN:-ethereum-sepolia}"
ZERO_ADDRESS="0x0000000000000000000000000000000000000000"

ensure_eoa() {
	[[ -n "${EOA:-}" ]] || EOA=$(cast wallet address --account "${ACCOUNT:?set ACCOUNT or EOA in .env}")
}

ensure_amount() {
	[[ -n "${AMOUNT:-}" ]] || { echo "[AXELAR] AMOUNT is required" >&2; exit 1; }
}

record_bridge_state() {
	node scripts-js/syncBridgeConfig.js record axelar "$@"
}

read_salt() {
	if [[ -f script/axelar/.salt ]]; then
		SALT="$(tr -d '[:space:]' < script/axelar/.salt)"
	fi
}

read_token_id() {
	if [[ -f script/axelar/.tokenid ]]; then
		TOKEN_ID="$(tr -d '[:space:]' < script/axelar/.tokenid)"
	fi
}

ensure_native_salt() {
	ensure_eoa
	read_salt
	if [[ -z "${SALT:-}" ]]; then
		SALT=$(cast keccak "axelar-hedera-its-salt:v1:${EOA}:${TOKEN_NAME}:${TOKEN_SYMBOL}:${TOKEN_DECIMALS}")
	fi
	printf '%s\n' "${SALT}" > script/axelar/.salt
}

ensure_token_id() {
	read_token_id
	[[ -n "${TOKEN_ID:-}" ]] || { echo "[AXELAR] TOKEN_ID is required; run deploy-hedera first or set TOKEN_ID" >&2; exit 1; }
}

tinybars_to_wei_style() {
	node -e 'console.log((BigInt(process.argv[1]) * 10000000000n).toString())' "$1"
}

lowercase() {
	printf '%s' "$1" | tr '[:upper:]' '[:lower:]'
}

hedera_gas_price() {
	cast gas-price --rpc-url hedera_testnet
}

hedera_its_call() {
	cast call "${INTERCHAIN_TOKEN_SERVICE}" "$@" --rpc-url hedera_testnet
}

resolve_token_id_from_factory() {
	ensure_eoa
	ensure_native_salt
	cast call "${INTERCHAIN_TOKEN_FACTORY}" "interchainTokenId(address,bytes32)(bytes32)" "${EOA}" "${SALT}" --rpc-url hedera_testnet
}

resolve_token_manager() {
	local rpc_url=$1
	local token_id=$2
	cast call "${INTERCHAIN_TOKEN_SERVICE}" "tokenManagerAddress(bytes32)(address)" "${token_id}" --rpc-url "${rpc_url}"
}

resolve_registered_token() {
	local rpc_url=$1
	local token_id=$2
	cast call "${INTERCHAIN_TOKEN_SERVICE}" "registeredTokenAddress(bytes32)(address)" "${token_id}" --rpc-url "${rpc_url}"
}

safe_resolve_token_manager() {
	resolve_token_manager "$@" 2>/dev/null || printf '<unavailable>'
}

safe_resolve_registered_token() {
	resolve_registered_token "$@" 2>/dev/null || printf '<unavailable>'
}

has_code() {
	local rpc_url=$1
	local address=$2
	[[ "$(cast code "${address}" --rpc-url "${rpc_url}")" != "0x" ]]
}

deploy_sepolia_custom() {
	ensure_eoa
	echo "[AXELAR] Deploying custom ${TOKEN_NAME} ${TOKEN_SYMBOL} on Sepolia"
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

deploy_hedera_wrapper() {
	ensure_eoa
	echo "[AXELAR] Deploying legacy wrapper ${TOKEN_NAME} ${TOKEN_SYMBOL} on Hedera"
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

fund_whbar_hedera() {
	ensure_eoa
	echo "[AXELAR] Funding WHBAR allowance for Hedera ITS token creation"
	local price whbar deposit_value allowance gas_price
	price="${HEDERA_TOKEN_CREATION_PRICE_TINYBARS:-$(hedera_its_call "tokenCreationPriceTinybars()(uint256)")}"
	whbar="${HEDERA_WHBAR_ADDRESS:-$(hedera_its_call "whbarAddress()(address)")}"
	deposit_value="${HEDERA_WHBAR_DEPOSIT_VALUE:-$(tinybars_to_wei_style "${price}")}"
	allowance="${HEDERA_WHBAR_ALLOWANCE:-${price}}"
	gas_price=$(hedera_gas_price)
	echo "[AXELAR] WHBAR: ${whbar}"
	echo "[AXELAR] token creation price (tinybars): ${price}"
	echo "[AXELAR] deposit msg.value (wei-style HBAR): ${deposit_value}"
	cast send "${whbar}" "deposit()" \
		--value "${deposit_value}" \
		--rpc-url hedera_testnet \
		--gas-price "${HEDERA_GAS_PRICE_WEI:-${gas_price}}" \
		--gas-limit "${HEDERA_TRANSFER_GAS_LIMIT}" \
		--account "${ACCOUNT}" \
		--legacy
	cast send "${whbar}" "approve(address,uint256)" "${INTERCHAIN_TOKEN_FACTORY}" "${allowance}" \
		--rpc-url hedera_testnet \
		--gas-price "${HEDERA_GAS_PRICE_WEI:-${gas_price}}" \
		--gas-limit "${HEDERA_TRANSFER_GAS_LIMIT}" \
		--account "${ACCOUNT}" \
		--legacy
	record_bridge_state hedera whbar="${whbar}" tokenCreationPrice="${price}" gasLimit="${HEDERA_DEPLOY_GAS_LIMIT}"
}

deploy_hedera_its() {
	ensure_eoa
	ensure_native_salt
	local minter="${HEDERA_ITS_MINTER:-${EOA}}"
	local gas_price token_id token_manager token_address whbar price
	echo "[AXELAR] Deploying Hedera-native ITS HTS token ${TOKEN_NAME} ${TOKEN_SYMBOL}"
	token_id="$(resolve_token_id_from_factory)"
	token_manager="$(resolve_token_manager hedera_testnet "${token_id}")"
	if has_code hedera_testnet "${token_manager}"; then
		token_address="$(resolve_registered_token hedera_testnet "${token_id}")"
		printf '%s\n' "${token_id}" > script/axelar/.tokenid
		record_bridge_state hedera bridgeToken="${token_address}" tokenManager="${token_manager}" gasLimit="${HEDERA_DEPLOY_GAS_LIMIT}"
		record_bridge_state route tokenId="${token_id}" salt="${SALT}" interchainTokenService="${INTERCHAIN_TOKEN_SERVICE}" gasValue="${GAS_VALUE_ITS}" nativeFee="${NATIVE_FEE_ITS}" hederaGasValue="${HEDERA_SEND_GAS_VALUE_ITS}" hederaNativeFee="${HEDERA_SEND_NATIVE_FEE_ITS}"
		echo "[AXELAR] Hedera native token already deployed"
		echo "[AXELAR] Hedera tokenId: ${token_id}"
		echo "[AXELAR] Hedera token manager: ${token_manager}"
		echo "[AXELAR] Hedera registered HTS token: ${token_address}"
		return
	fi
	if [[ "${SKIP_WHBAR_FUND:-0}" != "1" ]]; then
		fund_whbar_hedera
	fi
	gas_price=$(hedera_gas_price)
	cast send "${INTERCHAIN_TOKEN_FACTORY}" \
		"deployInterchainToken(bytes32,string,string,uint8,uint256,address)" \
		"${SALT}" \
		"${TOKEN_NAME}" \
		"${TOKEN_SYMBOL}" \
		"${TOKEN_DECIMALS}" \
		0 \
		"${minter}" \
		--rpc-url hedera_testnet \
		--gas-price "${HEDERA_GAS_PRICE_WEI:-${gas_price}}" \
		--gas-limit "${HEDERA_DEPLOY_GAS_LIMIT}" \
		--account "${ACCOUNT}" \
		--legacy
	printf '%s\n' "${token_id}" > script/axelar/.tokenid
	token_address="$(resolve_registered_token hedera_testnet "${token_id}")"
	whbar="${HEDERA_WHBAR_ADDRESS:-$(hedera_its_call "whbarAddress()(address)")}"
	price="${HEDERA_TOKEN_CREATION_PRICE_TINYBARS:-$(hedera_its_call "tokenCreationPriceTinybars()(uint256)")}"
	record_bridge_state hedera bridgeToken="${token_address}" tokenManager="${token_manager}" whbar="${whbar}" tokenCreationPrice="${price}" gasLimit="${HEDERA_DEPLOY_GAS_LIMIT}"
	record_bridge_state route tokenId="${token_id}" salt="${SALT}" interchainTokenService="${INTERCHAIN_TOKEN_SERVICE}" gasValue="${GAS_VALUE_ITS}" nativeFee="${NATIVE_FEE_ITS}" hederaGasValue="${HEDERA_SEND_GAS_VALUE_ITS}" hederaNativeFee="${HEDERA_SEND_NATIVE_FEE_ITS}"
	echo "[AXELAR] Hedera tokenId: ${token_id}"
	echo "[AXELAR] Hedera token manager: ${token_manager}"
	echo "[AXELAR] Hedera registered HTS token: ${token_address}"
}

deploy_remote_sepolia() {
	ensure_eoa
	ensure_native_salt
	local gas_price token_id local_minter remote_minter
	token_id="$(resolve_token_id_from_factory)"
	printf '%s\n' "${token_id}" > script/axelar/.tokenid
	echo "[AXELAR] Deploying remote Sepolia interchain token from Hedera"
	echo "[AXELAR] tokenId: ${token_id}"
	local_minter="${HEDERA_ITS_MINTER:-${EOA}}"
	remote_minter="${SEPOLIA_REMOTE_MINTER:-${local_minter}}"
	gas_price=$(hedera_gas_price)
	if [[ "${remote_minter}" == "${ZERO_ADDRESS}" ]]; then
		cast send "${INTERCHAIN_TOKEN_FACTORY}" \
			"deployRemoteInterchainToken(bytes32,string,uint256)" \
			"${SALT}" \
			"${SEPOLIA_REMOTE_DESTINATION_CHAIN}" \
			"${HEDERA_REMOTE_DEPLOY_GAS_VALUE_ITS}" \
			--value "${HEDERA_REMOTE_DEPLOY_NATIVE_FEE_ITS}" \
			--rpc-url hedera_testnet \
			--gas-price "${HEDERA_GAS_PRICE_WEI:-${gas_price}}" \
			--gas-limit "${HEDERA_TRANSFER_GAS_LIMIT}" \
			--account "${ACCOUNT}" \
			--legacy
	else
		if [[ "$(lowercase "${remote_minter}")" != "$(lowercase "${local_minter}")" ]]; then
			echo "[AXELAR] SEPOLIA_REMOTE_MINTER must match HEDERA_ITS_MINTER/EOA unless remote minter approval support is added" >&2
			exit 1
		fi
		cast send "${INTERCHAIN_TOKEN_FACTORY}" \
			"deployRemoteInterchainTokenWithMinter(bytes32,address,string,bytes,uint256)" \
			"${SALT}" \
			"${local_minter}" \
			"${SEPOLIA_REMOTE_DESTINATION_CHAIN}" \
			"0x" \
			"${HEDERA_REMOTE_DEPLOY_GAS_VALUE_ITS}" \
			--value "${HEDERA_REMOTE_DEPLOY_NATIVE_FEE_ITS}" \
			--rpc-url hedera_testnet \
			--gas-price "${HEDERA_GAS_PRICE_WEI:-${gas_price}}" \
			--gas-limit "${HEDERA_TRANSFER_GAS_LIMIT}" \
			--account "${ACCOUNT}" \
			--legacy
	fi
	record_bridge_state route tokenId="${token_id}" salt="${SALT}" interchainTokenService="${INTERCHAIN_TOKEN_SERVICE}" gasValue="${GAS_VALUE_ITS}" nativeFee="${NATIVE_FEE_ITS}" hederaGasValue="${HEDERA_SEND_GAS_VALUE_ITS}" hederaNativeFee="${HEDERA_SEND_NATIVE_FEE_ITS}"
}

resolve_hedera_token() {
	ensure_token_id
	local token_address token_manager whbar price
	token_address="$(resolve_registered_token hedera_testnet "${TOKEN_ID}")"
	token_manager="$(resolve_token_manager hedera_testnet "${TOKEN_ID}")"
	whbar="${HEDERA_WHBAR_ADDRESS:-$(hedera_its_call "whbarAddress()(address)")}"
	price="${HEDERA_TOKEN_CREATION_PRICE_TINYBARS:-$(hedera_its_call "tokenCreationPriceTinybars()(uint256)")}"
	record_bridge_state hedera bridgeToken="${token_address}" tokenManager="${token_manager}" whbar="${whbar}" tokenCreationPrice="${price}" gasLimit="${HEDERA_DEPLOY_GAS_LIMIT}"
	echo "[AXELAR] Hedera tokenId: ${TOKEN_ID}"
	echo "[AXELAR] Hedera token manager: ${token_manager}"
	echo "[AXELAR] Hedera registered token: ${token_address}"
}

resolve_sepolia_token() {
	ensure_token_id
	local token_address token_manager
	token_address="$(resolve_registered_token sepolia "${TOKEN_ID}")"
	token_manager="$(resolve_token_manager sepolia "${TOKEN_ID}")"
	record_bridge_state sepolia bridgeToken="${token_address}" tokenManager="${token_manager}"
	echo "[AXELAR] Sepolia tokenId: ${TOKEN_ID}"
	echo "[AXELAR] Sepolia token manager: ${token_manager}"
	echo "[AXELAR] Sepolia registered token: ${token_address}"
}

mint_hedera() {
	ensure_eoa
	ensure_amount
	ensure_token_id
	local recipient="${RECIPIENT:-${EOA}}"
	local token_address token_manager gas_price
	token_address="${HEDERA_BRIDGE_TOKEN:-$(resolve_registered_token hedera_testnet "${TOKEN_ID}")}"
	token_manager="${HEDERA_TOKEN_MANAGER:-$(resolve_token_manager hedera_testnet "${TOKEN_ID}")}"
	gas_price=$(hedera_gas_price)
	echo "[AXELAR] Minting Hedera native ITS token"
	cast send "${token_manager}" \
		"mintToken(address,address,uint256)" "${token_address}" "${recipient}" "${AMOUNT}" \
		--rpc-url hedera_testnet \
		--gas-price "${HEDERA_GAS_PRICE_WEI:-${gas_price}}" \
		--gas-limit "${HEDERA_TRANSFER_GAS_LIMIT}" \
		--account "${ACCOUNT}" \
		--legacy
}

mint_sepolia() {
	ensure_eoa
	ensure_amount
	ensure_token_id
	local recipient="${RECIPIENT:-${EOA}}"
	local token_address token_manager
	token_address="${SEPOLIA_BRIDGE_TOKEN:-$(resolve_registered_token sepolia "${TOKEN_ID}")}"
	token_manager="${SEPOLIA_TOKEN_MANAGER:-$(resolve_token_manager sepolia "${TOKEN_ID}")}"
	echo "[AXELAR] Minting Sepolia remote ITS token"
	forge script script/axelar/MintInterchainToken.s.sol:MintInterchainToken \
		--rpc-url sepolia --account "${ACCOUNT}" --broadcast -vvv \
		--sender "${EOA}" --chain-id 11155111 \
		--sig "run(address,address,address,uint256)" \
		"${token_manager}" "${token_address}" "${recipient}" "${AMOUNT}"
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
	read_token_id
	echo "[AXELAR] Approve Hedera token for Axelar ITS transfer"
	HEDERA_GAS_PRICE=$(cast gas-price --rpc-url hedera_testnet)
	local spender token_manager implementation_type
	if [[ -n "${HEDERA_APPROVAL_SPENDER:-}" ]]; then
		spender="${HEDERA_APPROVAL_SPENDER}"
	elif [[ -n "${TOKEN_ID:-}" ]]; then
		token_manager="$(resolve_token_manager hedera_testnet "${TOKEN_ID}")"
		implementation_type="$(cast call "${token_manager}" "implementationType()(uint256)" --rpc-url hedera_testnet)"
		if [[ "${implementation_type}" == "${NATIVE_INTERCHAIN_TOKEN_TYPE}" ]]; then
			spender="${token_manager}"
		else
			spender="${INTERCHAIN_TOKEN_SERVICE}"
		fi
	else
		spender="${INTERCHAIN_TOKEN_SERVICE}"
	fi
	echo "[AXELAR] approval spender: ${spender}"
	cast send "${HEDERA_BRIDGE_TOKEN}" \
		"approve(address,uint256)" "${spender}" "${AMOUNT}" \
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
	ensure_token_id
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

status() {
	read_salt
	read_token_id
	echo "[AXELAR] salt: ${SALT:-<missing>}"
	echo "[AXELAR] tokenId: ${TOKEN_ID:-<missing>}"
	if [[ -n "${TOKEN_ID:-}" ]]; then
		echo "[AXELAR] Hedera token manager: $(safe_resolve_token_manager hedera_testnet "${TOKEN_ID}")"
		echo "[AXELAR] Hedera registered token: $(safe_resolve_registered_token hedera_testnet "${TOKEN_ID}")"
		echo "[AXELAR] Sepolia token manager: $(safe_resolve_token_manager sepolia "${TOKEN_ID}")"
		echo "[AXELAR] Sepolia registered token: $(safe_resolve_registered_token sepolia "${TOKEN_ID}")"
	fi
}

case "${1:-}" in
deploy-sepolia) deploy_remote_sepolia ;;
deploy-hedera) deploy_hedera_its ;;
deploy-sepolia-custom) deploy_sepolia_custom ;;
deploy-hedera-wrapper) deploy_hedera_wrapper ;;
fund-whbar-hedera) fund_whbar_hedera ;;
deploy-remote-sepolia) deploy_remote_sepolia ;;
resolve-hedera-token) resolve_hedera_token ;;
resolve-sepolia-token) resolve_sepolia_token ;;
mint-hedera) mint_hedera ;;
mint-sepolia) mint_sepolia ;;
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
status) status ;;
"")
	echo "usage: $0 deploy-hedera | fund-whbar-hedera | deploy-remote-sepolia | resolve-hedera-token | resolve-sepolia-token | mint-hedera | mint-sepolia | approve-hedera | send-from-hedera | send-from-sepolia | status | legacy: deploy-sepolia-custom | deploy-hedera-wrapper | metadata-* | register-custom | link-remote | transfer-mintership-sepolia" >&2
	exit 1
	;;
*)
	echo "unknown step: $1" >&2
	exit 1
	;;
esac
echo "DONE: $1 ${2:-}"
