PHONY: build deploy deploy-and-generate-abis generate-abis get-address account compile flatten format lint test verify

DEPLOY_SCRIPT ?= script/Deploy.s.sol

# Setup the default deployer keystore (Anvil account #9, prefunded on the Hedera-forked node)
setup-deployer:
	rm -f ~/.foundry/keystores/scaffold-eth-default 2>/dev/null; \
	rm -rf broadcast/Deploy.s.sol/31337
	cast wallet import --private-key 0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6 --unsafe-password 'localhost' scaffold-eth-default

# Deploy the contracts to the local Hedera-forked node (started by `yarn chain`)
deploy: setup-deployer
	@if [ ! -f "$(DEPLOY_SCRIPT)" ]; then \
		echo "Error: Deploy script '$(DEPLOY_SCRIPT)' not found"; \
		exit 1; \
	fi
	@if [ "$(RPC_URL)" = "localhost" ]; then \
		rm -rf broadcast/Deploy.s.sol/31337; \
		if [ "$(ETH_KEYSTORE_ACCOUNT)" = "scaffold-eth-default" ]; then \
			forge script $(DEPLOY_SCRIPT) --rpc-url localhost --password localhost --broadcast --ffi; \
		else \
			forge script $(DEPLOY_SCRIPT) --rpc-url localhost --broadcast --ffi; \
		fi \
	else \
		forge script $(DEPLOY_SCRIPT) --rpc-url $(RPC_URL) --broadcast --ffi; \
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

# Verify contracts
verify:
	forge script script/VerifyAll.s.sol --ffi --rpc-url $(RPC_URL)
