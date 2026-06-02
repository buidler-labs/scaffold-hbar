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

# Deploy the contracts
deploy:
	@if [ ! -f "$(DEPLOY_SCRIPT)" ]; then \
		echo "Error: Deploy script '$(DEPLOY_SCRIPT)' not found"; \
		exit 1; \
	fi
	@mkdir -p deployments
	@if [ "$(RPC_URL)" = "localhost" ]; then \
		$(MAKE) setup-deployer; \
		rm -rf broadcast/Deploy.s.sol/31337; \
		LOCAL_ETH_KEYSTORE_ACCOUNT="$${ETH_KEYSTORE_ACCOUNT:-scaffold-hbar-default}"; \
		if [ "$$LOCAL_ETH_KEYSTORE_ACCOUNT" = "scaffold-hbar-default" ]; then \
			forge script $(DEPLOY_SCRIPT) --rpc-url localhost --account $$LOCAL_ETH_KEYSTORE_ACCOUNT --password localhost --broadcast --ffi; \
		else \
			forge script $(DEPLOY_SCRIPT) --rpc-url localhost --account $$LOCAL_ETH_KEYSTORE_ACCOUNT --broadcast --ffi; \
		fi \
	elif [ "$(RPC_URL)" = "hedera_testnet" ]; then \
		if [ -z "$(ETH_KEYSTORE_ACCOUNT)" ]; then \
			echo "Error: ETH_KEYSTORE_ACCOUNT is required for Hedera testnet deployments"; \
			echo "Usage: make deploy RPC_URL=hedera_testnet ETH_KEYSTORE_ACCOUNT=<keystore-account> DEPLOY_SCRIPT=$(DEPLOY_SCRIPT)"; \
			exit 1; \
		fi; \
		forge script $(DEPLOY_SCRIPT) --rpc-url $(RPC_URL) --chain-id 296 --account $(ETH_KEYSTORE_ACCOUNT) --broadcast --ffi --slow --legacy; \
	elif [ "$(RPC_URL)" = "hedera_mainnet" ]; then \
		if [ -z "$(ETH_KEYSTORE_ACCOUNT)" ]; then \
			echo "Error: ETH_KEYSTORE_ACCOUNT is required for Hedera mainnet deployments"; \
			echo "Usage: make deploy RPC_URL=hedera_mainnet ETH_KEYSTORE_ACCOUNT=<keystore-account> DEPLOY_SCRIPT=$(DEPLOY_SCRIPT)"; \
			exit 1; \
		fi; \
		forge script $(DEPLOY_SCRIPT) --rpc-url $(RPC_URL) --chain-id 295 --account $(ETH_KEYSTORE_ACCOUNT) --broadcast --ffi --slow --legacy; \
	else \
		forge script $(DEPLOY_SCRIPT) --rpc-url $(RPC_URL) --account $(ETH_KEYSTORE_ACCOUNT) --broadcast --ffi --slow; \
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
# Or:    make verify CONTRACT=0xAddress CONTRACT_PATH=contracts/MyContract.sol:MyContract RPC_URL=hedera_testnet
# See: https://hedera.com/blog/smart-contract-verification-sourcify-dev-now-supported
verify:
	@VERIFY_CHAIN_ID="$(CHAIN_ID)"; \
	if [ -z "$$VERIFY_CHAIN_ID" ]; then \
		if [ "$(RPC_URL)" = "hedera_testnet" ]; then \
			VERIFY_CHAIN_ID=296; \
		elif [ "$(RPC_URL)" = "hedera_mainnet" ]; then \
			VERIFY_CHAIN_ID=295; \
		fi; \
	fi; \
	if [ -z "$(CONTRACT)" ] || [ -z "$(CONTRACT_PATH)" ] || [ -z "$$VERIFY_CHAIN_ID" ]; then \
		echo "Usage: make verify CONTRACT=0xAddress CONTRACT_PATH=contracts/MyContract.sol:MyContract CHAIN_ID=296"; \
		echo "   or: make verify CONTRACT=0xAddress CONTRACT_PATH=contracts/MyContract.sol:MyContract RPC_URL=hedera_testnet"; \
		echo ""; \
		echo "Or use yarn commands:"; \
		echo "  yarn foundry:verify:testnet 0xAddress contracts/MyContract.sol:MyContract"; \
		echo "  yarn foundry:verify:mainnet 0xAddress contracts/MyContract.sol:MyContract"; \
		exit 1; \
	fi; \
	forge verify-contract $(CONTRACT) $(CONTRACT_PATH) --chain-id $$VERIFY_CHAIN_ID --verifier sourcify
