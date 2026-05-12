# Axelar — deploy wrappers (see bridge-axelar.sh); included from Makefile
.PHONY: axelar-help axelar-deploy axelar-deploy-sepolia axelar-deploy-hedera axelar-verify-sepolia axelar-verify-hedera axelar-metadata-sepolia axelar-metadata-hedera axelar-register-custom axelar-link-remote axelar-transfer-mintership-sepolia axelar-approve-hedera axelar-send-from-sepolia axelar-send-from-hedera

BRIDGE_AXELAR_SH := $(FOUNDRY_DIR)/script/axelar/bridge-axelar.sh

axelar-help:
	@echo "Axelar ITS tutorial (needs packages/foundry/.env: ACCOUNT, SEPOLIA_RPC_URL, HEDERA_TESTNET_RPC_URL)"
	@echo "  Step 1 deploy both chains:       make axelar-deploy"
	@echo "    or deploy separately:          make axelar-deploy-sepolia"
	@echo "                                   make axelar-deploy-hedera"
	@echo "  Optional verify:                 make axelar-verify-sepolia ADDR=0x..."
	@echo "                                   make axelar-verify-hedera ADDR=0x..."
	@echo "  Step 2 register metadata:        make axelar-metadata-sepolia"
	@echo "                                   make axelar-metadata-hedera"
	@echo "  Step 3 register and link token:  make axelar-register-custom"
	@echo "                                   make axelar-link-remote"
	@echo "  Step 4 transfer mintership:      make axelar-transfer-mintership-sepolia"
	@echo "  Step 5 test Sepolia -> Hedera:   make axelar-send-from-sepolia AMOUNT=100000000000000000 [RECIPIENT=0x...]"
	@echo "  Step 6 test Hedera -> Sepolia:   make axelar-approve-hedera AMOUNT=100000000000000000"
	@echo "                                   make axelar-send-from-hedera AMOUNT=100000000000000000 [RECIPIENT=0x...]"
	@echo "  Final sync frontend config:      make bridge-sync-next PROVIDER=axelar"
	@echo "Or: bash script/axelar/bridge-axelar.sh verify-sepolia 0x..."

axelar-deploy: axelar-deploy-sepolia axelar-deploy-hedera

axelar-deploy-sepolia:
	@cd "$(FOUNDRY_DIR)" && bash "$(BRIDGE_AXELAR_SH)" deploy-sepolia

axelar-deploy-hedera:
	@cd "$(FOUNDRY_DIR)" && bash "$(BRIDGE_AXELAR_SH)" deploy-hedera

axelar-verify-sepolia:
ifndef ADDR
	$(error ADDR is required, e.g. make axelar-verify-sepolia ADDR=0x...)
endif
	@cd "$(FOUNDRY_DIR)" && bash "$(BRIDGE_AXELAR_SH)" verify-sepolia "$(ADDR)"

axelar-verify-hedera:
ifndef ADDR
	$(error ADDR is required, e.g. make axelar-verify-hedera ADDR=0x...)
endif
	@cd "$(FOUNDRY_DIR)" && bash "$(BRIDGE_AXELAR_SH)" verify-hedera "$(ADDR)"

axelar-metadata-sepolia:
	@cd "$(FOUNDRY_DIR)" && bash "$(BRIDGE_AXELAR_SH)" metadata-sepolia

axelar-metadata-hedera:
	@cd "$(FOUNDRY_DIR)" && bash "$(BRIDGE_AXELAR_SH)" metadata-hedera

axelar-register-custom:
	@cd "$(FOUNDRY_DIR)" && bash "$(BRIDGE_AXELAR_SH)" register-custom

axelar-link-remote:
	@cd "$(FOUNDRY_DIR)" && bash "$(BRIDGE_AXELAR_SH)" link-remote

axelar-transfer-mintership-sepolia:
	@cd "$(FOUNDRY_DIR)" && bash "$(BRIDGE_AXELAR_SH)" transfer-mintership-sepolia

axelar-approve-hedera:
	@cd "$(FOUNDRY_DIR)" && AMOUNT="$(AMOUNT)" bash "$(BRIDGE_AXELAR_SH)" approve-hedera

axelar-send-from-sepolia:
	@cd "$(FOUNDRY_DIR)" && AMOUNT="$(AMOUNT)" RECIPIENT="$(RECIPIENT)" bash "$(BRIDGE_AXELAR_SH)" send-from-sepolia

axelar-send-from-hedera:
	@cd "$(FOUNDRY_DIR)" && AMOUNT="$(AMOUNT)" RECIPIENT="$(RECIPIENT)" bash "$(BRIDGE_AXELAR_SH)" send-from-hedera
