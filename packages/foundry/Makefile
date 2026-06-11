.PHONY: build deploy deploy-and-generate-abis generate-abis get-address account chain fork compile flatten format lint test verify bridge-sync-next

DEPLOY_SCRIPT ?=
PROVIDER ?= all
RPC_URL ?= localhost
ETH_KEYSTORE_ACCOUNT ?= scaffold-hbar-default
FOUNDRY_DIR := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))

include script/axelar/bridge-axelar.mk
include script/ccip/bridge-ccip.mk
include script/layerzero/bridge-layerzero.mk

# Low-level local dev helper only. The bridge tutorials target Sepolia + Hedera Testnet.
# Starts a plain local Anvil chain without Hedera-specific behavior.
chain:
	anvil

# Low-level local dev helper only. Starts an Anvil fork using the configured Hedera RPC alias.
fork:
	@FORK_URL=$${FORK_URL:-hedera_testnet}; \
	echo "Starting Anvil fork against $$FORK_URL with chain-id 296..."; \
	anvil --fork-url $$FORK_URL --chain-id 296

# Setup the default deployer keystore (Anvil account #9, prefunded on the Hedera node)
setup-deployer:
	rm -f ~/.foundry/keystores/scaffold-hbar-default 2>/dev/null; \
	rm -rf broadcast/Deploy.s.sol/31337
	cast wallet import --private-key 0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6 --unsafe-password 'localhost' scaffold-hbar-default

# Generic deploy entrypoint for custom scripts. New bridge users should prefer
# the provider runbooks: make axelar-help, make ccip-help, or make layerzero-help.
deploy:
	@if [ -z "$(DEPLOY_SCRIPT)" ]; then \
		echo "Error: no deploy script specified."; \
		echo "Use DEPLOY_SCRIPT=script/<protocol>/<Script>.s.sol make deploy"; \
		echo "or run: make axelar-help, make ccip-help, make layerzero-help"; \
		exit 1; \
	fi
	@if [ ! -f "$(DEPLOY_SCRIPT)" ]; then \
		echo "Error: Deploy script '$(DEPLOY_SCRIPT)' not found"; \
		exit 1; \
	fi
	@mkdir -p deployments
	@if [ "$(RPC_URL)" = "localhost" ]; then \
		$(MAKE) setup-deployer; \
		rm -rf broadcast/Deploy.s.sol/31337; \
		if [ "$(ETH_KEYSTORE_ACCOUNT)" = "scaffold-hbar-default" ]; then \
			forge script $(DEPLOY_SCRIPT) --rpc-url localhost --password localhost --broadcast --ffi; \
		else \
			forge script $(DEPLOY_SCRIPT) --rpc-url localhost --account $(ETH_KEYSTORE_ACCOUNT) --broadcast --ffi; \
		fi \
	elif [ "$(RPC_URL)" = "hedera_testnet" ] || [ "$(RPC_URL)" = "hedera_mainnet" ]; then \
		forge script $(DEPLOY_SCRIPT) --rpc-url $(RPC_URL) --account $(ETH_KEYSTORE_ACCOUNT) --broadcast --ffi --slow --legacy; \
	else \
		forge script $(DEPLOY_SCRIPT) --rpc-url $(RPC_URL) --account $(ETH_KEYSTORE_ACCOUNT) --broadcast --ffi --slow; \
	fi

# Deploy and generate ABIs (used by scripts-js/parseArgs.js)
deploy-and-generate-abis: deploy generate-abis

# Generate TypeScript ABIs for the Next.js frontend
generate-abis:
	node scripts-js/generateTsAbis.js

bridge-sync-next:
	@node scripts-js/syncBridgeConfig.js sync "$(PROVIDER)"

# List account
account:
	@node scripts-js/checkAccountBalance.js

# Get address of a keystore
get-address:
	@cast wallet address --account $(ACCOUNT_NAME)

# Compile contracts
compile:
	forge compile

# Flatten contracts
flatten:
	forge flatten

# Format code
format:
	forge fmt && prettier --write ./scripts-js/**/*.js

# Lint code
lint:
	forge fmt --check && prettier --check ./scripts-js/**/*.js

# Run tests
test:
	forge test

# Verify contracts on Sourcify. Hedera testnet/mainnet are supported by the main Sourcify instance.
# Usage: make verify CONTRACT=0xAddress CONTRACT_PATH=contracts/MyContract.sol:MyContract CHAIN_ID=296
verify:
	@if [ -z "$(CONTRACT)" ] || [ -z "$(CONTRACT_PATH)" ] || [ -z "$(CHAIN_ID)" ]; then \
		echo "Usage: make verify CONTRACT=0xAddress CONTRACT_PATH=contracts/MyContract.sol:MyContract CHAIN_ID=296"; \
		echo ""; \
		echo "Or use yarn commands:"; \
		echo "  yarn foundry:verify:testnet 0xAddress contracts/MyContract.sol:MyContract"; \
		echo "  yarn foundry:verify:mainnet 0xAddress contracts/MyContract.sol:MyContract"; \
		exit 1; \
	fi
	forge verify-contract $(CONTRACT) $(CONTRACT_PATH) --chain-id $(CHAIN_ID) --verifier sourcify
