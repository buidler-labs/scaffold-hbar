.DEFAULT_GOAL := help

.PHONY: help deploy deploy-and-generate-abis run-script generate-abis

DEPLOY_SCRIPT ?= script/DeployChainlinkOracle.s.sol
SCRIPT ?= script/ReadPythOracle.s.sol
RPC_URL ?= hedera_testnet
ETH_KEYSTORE_ACCOUNT ?= $(ACCOUNT_NAME)
ACCOUNT_ARGS :=

ifneq ($(strip $(ACCOUNT_NAME)),)
ACCOUNT_ARGS := --account $(ACCOUNT_NAME)
endif

help:
	@echo "Internal Foundry orchestration targets:"
	@echo "  make deploy-and-generate-abis DEPLOY_SCRIPT=script/Deploy.s.sol RPC_URL=hedera_testnet ETH_KEYSTORE_ACCOUNT=<keystore>"
	@echo "  make run-script SCRIPT=script/ReadPythOracle.s.sol RPC_URL=hedera_testnet ACCOUNT_NAME=<keystore>"

# Deploy the selected script to Hedera testnet/mainnet.
deploy:
	@if [ ! -f "$(DEPLOY_SCRIPT)" ]; then \
		echo "Error: Deploy script '$(DEPLOY_SCRIPT)' not found"; \
		exit 1; \
	fi
	@mkdir -p deployments
	@if [ "$(RPC_URL)" = "hedera_testnet" ]; then \
		forge script $(DEPLOY_SCRIPT) --rpc-url https://testnet.hashio.io/api --account $(ETH_KEYSTORE_ACCOUNT) --broadcast --ffi --slow --legacy; \
	elif [ "$(RPC_URL)" = "hedera_mainnet" ]; then \
		forge script $(DEPLOY_SCRIPT) --rpc-url https://mainnet.hashio.io/api --account $(ETH_KEYSTORE_ACCOUNT) --broadcast --ffi --slow --legacy; \
	else \
		forge script $(DEPLOY_SCRIPT) --rpc-url $(RPC_URL) $(ACCOUNT_ARGS) --broadcast --ffi --slow; \
	fi

# Deploy and generate ABIs (used by scripts-js/parseArgs.js).
deploy-and-generate-abis: deploy generate-abis

# Run the selected interaction script. Some scripts, such as Pyth reads, broadcast transactions.
run-script:
	@if [ ! -f "$(SCRIPT)" ]; then \
		echo "Error: Script '$(SCRIPT)' not found"; \
		exit 1; \
	fi
	forge script $(SCRIPT) --rpc-url $(RPC_URL) $(ACCOUNT_ARGS) --broadcast --ffi --slow

# Generate TypeScript ABIs for the Next.js frontend.
generate-abis:
	node scripts-js/generateTsAbis.js
