PHONY: build deploy deploy-and-generate-abis generate-abis get-address account chain fork compile flatten format lint test verify

DEPLOY_SCRIPT ?= script/Deploy.s.sol

# Start a plain local Anvil chain (no fork)
chain:
	anvil

fork:
	@FORK_URL=$${FORK_URL:-$${HEDERA_RPC_URL:-https://testnet.hashio.io/api}}; \
	echo "Starting Anvil fork against $$FORK_URL with chain-id 296..."; \
	anvil --fork-url $$FORK_URL --chain-id 296

# Setup the default deployer keystore (Anvil account #9, prefunded on the Hedera node)
setup-deployer:
	rm -f ~/.foundry/keystores/scaffold-hbar-default 2>/dev/null; \
	rm -rf broadcast/Deploy.s.sol/31337
	cast wallet import --private-key 0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6 --unsafe-password 'localhost' scaffold-hbar-default

# Deploy the contracts to the local Hedera-forked node (start with `make fork` or `yarn foundry:fork` from repo root)
deploy: setup-deployer
	@if [ ! -f "$(DEPLOY_SCRIPT)" ]; then \
		echo "Error: Deploy script '$(DEPLOY_SCRIPT)' not found"; \
		exit 1; \
	fi
	@mkdir -p deployments
	@if [ "$(RPC_URL)" = "localhost" ]; then \
		rm -rf broadcast/Deploy.s.sol/31337; \
		if [ "$(ETH_KEYSTORE_ACCOUNT)" = "scaffold-hbar-default" ]; then \
			forge script $(DEPLOY_SCRIPT) --rpc-url localhost --password localhost --broadcast --ffi; \
		else \
			forge script $(DEPLOY_SCRIPT) --rpc-url localhost --broadcast --ffi; \
		fi \
	elif [ "$(RPC_URL)" = "hedera_testnet" ]; then \
		forge script $(DEPLOY_SCRIPT) --rpc-url $(RPC_URL) --chain-id 296 --broadcast --ffi --slow --legacy --skip-simulation; \
	elif [ "$(RPC_URL)" = "hedera_mainnet" ]; then \
		forge script $(DEPLOY_SCRIPT) --rpc-url $(RPC_URL) --chain-id 295 --broadcast --ffi --slow --legacy --skip-simulation; \
	else \
		forge script $(DEPLOY_SCRIPT) --rpc-url $(RPC_URL) --broadcast --ffi --slow; \
	fi

# Deploy and generate ABIs (used by scripts-js/parseArgs.js)
deploy-and-generate-abis: deploy generate-abis

# Generate TypeScript ABIs for the Next.js frontend
generate-abis:
	node scripts-js/generateTsAbis.js

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

# Verify contracts on Sourcify (Hedera is now supported on the main Sourcify instance)
# Usage: make verify CONTRACT=0xAddress CONTRACT_PATH=contracts/MyContract.sol:MyContract CHAIN_ID=296
# See: https://hedera.com/blog/smart-contract-verification-sourcify-dev-now-supported
verify:
	@if [ -z "$(CONTRACT)" ] || [ -z "$(CONTRACT_PATH)" ]; then \
		echo "Usage: make verify CONTRACT=0xAddress CONTRACT_PATH=contracts/MyContract.sol:MyContract CHAIN_ID=296"; \
		echo ""; \
		echo "Or use yarn commands:"; \
		echo "  yarn verify:testnet 0xAddress contracts/MyContract.sol:MyContract"; \
		echo "  yarn verify:mainnet 0xAddress contracts/MyContract.sol:MyContract"; \
		exit 1; \
	fi
	@node scripts-js/verifySourcify.js $(CHAIN_ID) $(CONTRACT) $(CONTRACT_PATH)
