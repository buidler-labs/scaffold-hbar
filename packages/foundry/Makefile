.PHONY: build deploy deploy-and-generate-abis generate-abis get-address account chain fork compile flatten format lint test verify bridge-sync-next

DEPLOY_SCRIPT ?=
PROVIDER ?= all
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
	@$(MAKE) setup-deployer
	@mkdir -p deployments
	@if [ "$(RPC_URL)" = "localhost" ]; then \
		rm -rf broadcast/Deploy.s.sol/31337; \
		if [ "$(ETH_KEYSTORE_ACCOUNT)" = "scaffold-hbar-default" ]; then \
			forge script $(DEPLOY_SCRIPT) --rpc-url localhost --password localhost --broadcast --ffi; \
		else \
			forge script $(DEPLOY_SCRIPT) --rpc-url localhost --broadcast --ffi; \
		fi \
	else \
		forge script $(DEPLOY_SCRIPT) --rpc-url $(RPC_URL) --broadcast --ffi --slow; \
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

# Verify contracts
# For Hedera networks (chainId 295/296) this calls verifyHedera.js which uses
# Hashscan's legacy Sourcify v1 API directly (forge's built-in Sourcify client
# uses APIv2 which Hashscan does not support).
verify:
	@if [ "$(RPC_URL)" = "hedera_testnet" ] || [ "$(RPC_URL)" = "hedera_mainnet" ]; then \
		node scripts-js/verifyHedera.js $$([ "$(RPC_URL)" = "hedera_mainnet" ] && echo 295 || echo 296); \
	else \
		forge script script/VerifyAll.s.sol --ffi --rpc-url $(RPC_URL); \
	fi
