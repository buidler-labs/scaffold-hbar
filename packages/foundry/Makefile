.PHONY: help deploy deploy-and-generate-abis deploy-consumer-testnet deploy-consumer-mainnet deploy-chainlink-testnet deploy-chainlink-mainnet deploy-supra-testnet deploy-supra-mainnet deploy-pyth-testnet deploy-pyth-mainnet run-script set-consumer-oracle-testnet set-consumer-oracle-mainnet generate-abis get-address account compile flatten format lint read-chainlink-testnet read-chainlink-mainnet read-supra-testnet read-supra-mainnet read-pyth-testnet read-pyth-mainnet test test-chainlink-testnet test-chainlink-mainnet test-supra-testnet test-supra-mainnet test-pyth-testnet test-pyth-mainnet verify verify-testnet verify-mainnet

DEPLOY_SCRIPT ?= script/DeployChainlinkOracle.s.sol
SCRIPT ?= script/ReadPythOracle.s.sol
CONSUMER_DEPLOY_SCRIPT := script/DeployOracleConsumer.s.sol
SET_CONSUMER_ORACLE_SCRIPT := script/SetConsumerOracle.s.sol
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
ETH_KEYSTORE_ACCOUNT ?= $(ACCOUNT_NAME)
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
	@echo "Consumer deployment:"
	@echo "  make deploy-consumer-testnet ACCOUNT_NAME=<keystore> ORACLE_ADAPTER_NAME=ChainlinkPriceOracleAdapter"
	@echo "  make deploy-consumer-mainnet ACCOUNT_NAME=<keystore> ORACLE_ADAPTER_NAME=ChainlinkPriceOracleAdapter"
	@echo "  make set-consumer-oracle-testnet ACCOUNT_NAME=<keystore> ORACLE_ADAPTER_NAME=PythPriceOracleAdapter"
	@echo "  make set-consumer-oracle-mainnet ACCOUNT_NAME=<keystore> ORACLE_ADAPTER_NAME=PythPriceOracleAdapter"
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
	@echo "  make verify-testnet CONTRACT=0xAddress CONTRACT_PATH=contracts/MyContract.sol:MyContract"
	@echo "  make verify-mainnet CONTRACT=0xAddress CONTRACT_PATH=contracts/MyContract.sol:MyContract"

# Deploy the selected script to Hedera testnet/mainnet.
deploy:
	@if [ ! -f "$(DEPLOY_SCRIPT)" ]; then \
		echo "Error: Deploy script '$(DEPLOY_SCRIPT)' not found"; \
		exit 1; \
	fi
	@mkdir -p deployments
	@if [ "$(RPC_URL)" = "hedera_testnet" ]; then \
		forge script $(DEPLOY_SCRIPT) --rpc-url https://testnet.hashio.io/api --account $(ETH_KEYSTORE_ACCOUNT) --broadcast --ffi --slow --legacy --skip-simulation; \
	elif [ "$(RPC_URL)" = "hedera_mainnet" ]; then \
		forge script $(DEPLOY_SCRIPT) --rpc-url https://mainnet.hashio.io/api --account $(ETH_KEYSTORE_ACCOUNT) --broadcast --ffi --slow --legacy --skip-simulation; \
	else \
		forge script $(DEPLOY_SCRIPT) --rpc-url $(RPC_URL) $(ACCOUNT_ARGS) --broadcast --ffi --slow; \
	fi

# Deploy and generate ABIs (used by scripts-js/parseArgs.js)
deploy-and-generate-abis: deploy generate-abis

# Run the selected interaction script. Some scripts, such as Pyth reads, broadcast transactions.
run-script:
	@if [ ! -f "$(SCRIPT)" ]; then \
		echo "Error: Script '$(SCRIPT)' not found"; \
		exit 1; \
	fi
	forge script $(SCRIPT) --rpc-url $(RPC_URL) $(ACCOUNT_ARGS) --broadcast --ffi --slow

# Deploy the demo consumer once, pointing at an already deployed adapter.
deploy-consumer-testnet:
	$(MAKE) deploy-and-generate-abis DEPLOY_SCRIPT=$(CONSUMER_DEPLOY_SCRIPT) RPC_URL=hedera_testnet

deploy-consumer-mainnet:
	$(MAKE) deploy-and-generate-abis DEPLOY_SCRIPT=$(CONSUMER_DEPLOY_SCRIPT) RPC_URL=hedera_mainnet

# Deploy the default multi-pair Chainlink Hedera adapter.
deploy-chainlink-testnet:
	$(MAKE) deploy-and-generate-abis DEPLOY_SCRIPT=$(CHAINLINK_DEPLOY_SCRIPT) RPC_URL=hedera_testnet

deploy-chainlink-mainnet:
	$(MAKE) deploy-and-generate-abis DEPLOY_SCRIPT=$(CHAINLINK_DEPLOY_SCRIPT) RPC_URL=hedera_mainnet

# Deploy the default multi-pair Supra Hedera push adapter.
deploy-supra-testnet:
	$(MAKE) deploy-and-generate-abis DEPLOY_SCRIPT=$(SUPRA_DEPLOY_SCRIPT) RPC_URL=hedera_testnet

deploy-supra-mainnet:
	$(MAKE) deploy-and-generate-abis DEPLOY_SCRIPT=$(SUPRA_DEPLOY_SCRIPT) RPC_URL=hedera_mainnet

# Deploy the default multi-pair Pyth Hedera pull adapter.
deploy-pyth-testnet:
	$(MAKE) deploy-and-generate-abis DEPLOY_SCRIPT=$(PYTH_DEPLOY_SCRIPT) RPC_URL=hedera_testnet

deploy-pyth-mainnet:
	$(MAKE) deploy-and-generate-abis DEPLOY_SCRIPT=$(PYTH_DEPLOY_SCRIPT) RPC_URL=hedera_mainnet

# Update the deployed consumer to use a selected adapter.
set-consumer-oracle-testnet:
	$(MAKE) run-script SCRIPT=$(SET_CONSUMER_ORACLE_SCRIPT) RPC_URL=hedera_testnet

set-consumer-oracle-mainnet:
	$(MAKE) run-script SCRIPT=$(SET_CONSUMER_ORACLE_SCRIPT) RPC_URL=hedera_mainnet

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

# Read deployed Chainlink adapter prices and demo consumer conversions.
read-chainlink-testnet:
	forge script $(CHAINLINK_READ_SCRIPT) --rpc-url hedera_testnet

read-chainlink-mainnet:
	forge script $(CHAINLINK_READ_SCRIPT) --rpc-url hedera_mainnet

# Read deployed Supra adapter prices and demo consumer conversions.
read-supra-testnet:
	forge script $(SUPRA_READ_SCRIPT) --rpc-url hedera_testnet

read-supra-mainnet:
	forge script $(SUPRA_READ_SCRIPT) --rpc-url hedera_mainnet

# Update deployed Pyth pull adapter, then read adapter prices and demo consumer conversions.
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

# Verify contracts on Sourcify (Hedera is supported on the main Sourcify instance).
# Usage: make verify CONTRACT=0xAddress CONTRACT_PATH=contracts/MyContract.sol:MyContract CHAIN_ID=296
verify:
	@if [ -z "$(CONTRACT)" ] || [ -z "$(CONTRACT_PATH)" ] || [ -z "$(CHAIN_ID)" ]; then \
		echo "Usage: make verify CONTRACT=0xAddress CONTRACT_PATH=contracts/MyContract.sol:MyContract CHAIN_ID=296"; \
		echo ""; \
		echo "Or use yarn commands:"; \
		echo "  yarn verify:testnet 0xAddress contracts/MyContract.sol:MyContract"; \
		echo "  yarn verify:mainnet 0xAddress contracts/MyContract.sol:MyContract"; \
		exit 1; \
	fi
	forge verify-contract $(CONTRACT) $(CONTRACT_PATH) --chain-id $(CHAIN_ID) --verifier sourcify

verify-testnet:
	$(MAKE) verify CHAIN_ID=296

verify-mainnet:
	$(MAKE) verify CHAIN_ID=295
