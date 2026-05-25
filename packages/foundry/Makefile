.PHONY: help deploy deploy-and-generate-abis deploy-chainlink-testnet deploy-chainlink-mainnet deploy-supra-testnet deploy-supra-mainnet deploy-pyth-testnet deploy-pyth-mainnet run-script generate-abis get-address account compile flatten format lint read-chainlink-testnet read-chainlink-mainnet read-supra-testnet read-supra-mainnet read-pyth-testnet read-pyth-mainnet test test-chainlink-testnet test-chainlink-mainnet test-supra-testnet test-supra-mainnet test-pyth-testnet test-pyth-mainnet verify verify-testnet verify-mainnet

DEPLOY_SCRIPT ?= script/DeployChainlinkOracle.s.sol
SCRIPT ?= script/ReadPythOracle.s.sol
CHAINLINK_DEPLOY_SCRIPT := script/DeployChainlinkOracle.s.sol
SUPRA_DEPLOY_SCRIPT := script/DeploySupraOracle.s.sol
PYTH_DEPLOY_SCRIPT := script/DeployPythOracle.s.sol
CHAINLINK_READ_SCRIPT := script/ReadChainlinkOracle.s.sol
SUPRA_READ_SCRIPT := script/ReadSupraOracle.s.sol
PYTH_READ_SCRIPT := script/ReadPythOracle.s.sol
CHAINLINK_FORK_TEST := test/integration/ChainlinkPriceOracleAdapterFork.t.sol
SUPRA_FORK_TEST := test/integration/SupraPriceOracleAdapterFork.t.sol
PYTH_FORK_TEST := test/integration/PythPriceOracleAdapterFork.t.sol
RPC_URL ?= hedera_testnet
ACCOUNT_ARGS :=

ifneq ($(strip $(ACCOUNT_NAME)),)
ACCOUNT_ARGS := --account $(ACCOUNT_NAME)
endif

help:
	@echo "Foundry oracle template commands"
	@echo ""
	@echo "Build and quality:"
	@echo "  make compile"
	@echo "  make test"
	@echo "  make lint"
	@echo "  make format"
	@echo ""
	@echo "Chainlink deployment:"
	@echo "  make deploy-chainlink-testnet ACCOUNT_NAME=<keystore>"
	@echo "  make deploy-chainlink-mainnet ACCOUNT_NAME=<keystore>"
	@echo ""
	@echo "Supra deployment:"
	@echo "  make deploy-supra-testnet ACCOUNT_NAME=<keystore>"
	@echo "  make deploy-supra-mainnet ACCOUNT_NAME=<keystore>"
	@echo ""
	@echo "Pyth deployment:"
	@echo "  make deploy-pyth-testnet ACCOUNT_NAME=<keystore>"
	@echo "  make deploy-pyth-mainnet ACCOUNT_NAME=<keystore>"
	@echo ""
	@echo "Chainlink fork smoke tests:"
	@echo "  make test-chainlink-testnet"
	@echo "  make test-chainlink-mainnet"
	@echo ""
	@echo "Supra fork smoke tests:"
	@echo "  make test-supra-testnet"
	@echo "  make test-supra-mainnet"
	@echo ""
	@echo "Pyth fork smoke tests:"
	@echo "  make test-pyth-testnet"
	@echo "  make test-pyth-mainnet"
	@echo ""
	@echo "Chainlink reads:"
	@echo "  make read-chainlink-testnet"
	@echo "  make read-chainlink-mainnet"
	@echo ""
	@echo "Supra reads:"
	@echo "  make read-supra-testnet"
	@echo "  make read-supra-mainnet"
	@echo ""
	@echo "Pyth reads:"
	@echo "  make read-pyth-testnet ACCOUNT_NAME=<keystore>"
	@echo "  make read-pyth-mainnet ACCOUNT_NAME=<keystore>"
	@echo ""
	@echo "Verification:"
	@echo "  make verify-testnet"
	@echo "  make verify-mainnet"

# Deploy the selected script to Hedera testnet/mainnet.
deploy:
	@if [ ! -f "$(DEPLOY_SCRIPT)" ]; then \
		echo "Error: Deploy script '$(DEPLOY_SCRIPT)' not found"; \
		exit 1; \
	fi
	@mkdir -p deployments
	forge script $(DEPLOY_SCRIPT) --rpc-url $(RPC_URL) $(ACCOUNT_ARGS) --broadcast --ffi --slow

# Deploy and generate ABIs (used by scripts-js/parseArgs.js)
deploy-and-generate-abis: deploy generate-abis

# Run the selected interaction script. Some scripts, such as Pyth reads, broadcast transactions.
run-script:
	@if [ ! -f "$(SCRIPT)" ]; then \
		echo "Error: Script '$(SCRIPT)' not found"; \
		exit 1; \
	fi
	forge script $(SCRIPT) --rpc-url $(RPC_URL) $(ACCOUNT_ARGS) --broadcast --ffi --slow

# Deploy and register the default Chainlink Hedera adapters.
deploy-chainlink-testnet:
	$(MAKE) deploy-and-generate-abis DEPLOY_SCRIPT=$(CHAINLINK_DEPLOY_SCRIPT) RPC_URL=hedera_testnet

deploy-chainlink-mainnet:
	$(MAKE) deploy-and-generate-abis DEPLOY_SCRIPT=$(CHAINLINK_DEPLOY_SCRIPT) RPC_URL=hedera_mainnet

# Deploy and register the default Supra Hedera push adapters.
deploy-supra-testnet:
	$(MAKE) deploy-and-generate-abis DEPLOY_SCRIPT=$(SUPRA_DEPLOY_SCRIPT) RPC_URL=hedera_testnet

deploy-supra-mainnet:
	$(MAKE) deploy-and-generate-abis DEPLOY_SCRIPT=$(SUPRA_DEPLOY_SCRIPT) RPC_URL=hedera_mainnet

# Deploy and register the default Pyth Hedera pull adapters.
deploy-pyth-testnet:
	$(MAKE) deploy-and-generate-abis DEPLOY_SCRIPT=$(PYTH_DEPLOY_SCRIPT) RPC_URL=hedera_testnet

deploy-pyth-mainnet:
	$(MAKE) deploy-and-generate-abis DEPLOY_SCRIPT=$(PYTH_DEPLOY_SCRIPT) RPC_URL=hedera_mainnet

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

# Read deployed Chainlink registry prices and demo consumer conversions.
read-chainlink-testnet:
	forge script $(CHAINLINK_READ_SCRIPT) --rpc-url hedera_testnet

read-chainlink-mainnet:
	forge script $(CHAINLINK_READ_SCRIPT) --rpc-url hedera_mainnet

# Read deployed Supra registry prices and demo consumer conversions.
read-supra-testnet:
	forge script $(SUPRA_READ_SCRIPT) --rpc-url hedera_testnet

read-supra-mainnet:
	forge script $(SUPRA_READ_SCRIPT) --rpc-url hedera_mainnet

# Update deployed Pyth pull adapters, then read registry prices and demo consumer conversions.
read-pyth-testnet:
	$(MAKE) run-script SCRIPT=$(PYTH_READ_SCRIPT) RPC_URL=hedera_testnet

read-pyth-mainnet:
	$(MAKE) run-script SCRIPT=$(PYTH_READ_SCRIPT) RPC_URL=hedera_mainnet

# Run Chainlink adapter fork smoke tests against real Hedera feed addresses.
test-chainlink-testnet:
	FOUNDRY_PROFILE=integration forge test --fork-url $${HEDERA_TESTNET_RPC_URL:-https://testnet.hashio.io/api} --match-path $(CHAINLINK_FORK_TEST)

test-chainlink-mainnet:
	FOUNDRY_PROFILE=integration forge test --fork-url $${HEDERA_MAINNET_RPC_URL:-https://mainnet.hashio.io/api} --match-path $(CHAINLINK_FORK_TEST)

# Run Supra adapter fork smoke tests against real Hedera push oracle addresses.
test-supra-testnet:
	FOUNDRY_PROFILE=integration forge test --fork-url $${HEDERA_TESTNET_RPC_URL:-https://testnet.hashio.io/api} --match-path $(SUPRA_FORK_TEST)

test-supra-mainnet:
	FOUNDRY_PROFILE=integration forge test --fork-url $${HEDERA_MAINNET_RPC_URL:-https://mainnet.hashio.io/api} --match-path $(SUPRA_FORK_TEST)

# Run Pyth adapter fork smoke tests against real Hedera Pyth addresses and Hermes update data.
test-pyth-testnet:
	FOUNDRY_PROFILE=integration forge test --fork-url $${HEDERA_TESTNET_RPC_URL:-https://testnet.hashio.io/api} --ffi --match-path $(PYTH_FORK_TEST)

test-pyth-mainnet:
	FOUNDRY_PROFILE=integration forge test --fork-url $${HEDERA_MAINNET_RPC_URL:-https://mainnet.hashio.io/api} --ffi --match-path $(PYTH_FORK_TEST)

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

verify-testnet:
	$(MAKE) verify RPC_URL=hedera_testnet

verify-mainnet:
	$(MAKE) verify RPC_URL=hedera_mainnet
