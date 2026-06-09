# Axelar — Hedera ITS helpers (see bridge-axelar.sh); included from Makefile
.PHONY: axelar-help axelar-deploy axelar-deploy-sepolia axelar-deploy-hedera axelar-deploy-remote-sepolia axelar-resolve-hedera-token axelar-resolve-sepolia-token axelar-fund-whbar-hedera axelar-mint-hedera axelar-mint-sepolia axelar-status axelar-approve-hedera axelar-send-from-sepolia axelar-send-from-hedera

BRIDGE_AXELAR_SH := $(FOUNDRY_DIR)/script/axelar/bridge-axelar.sh

axelar-help:
	@echo "Axelar ITS tutorial (needs packages/foundry/.env: ACCOUNT, SEPOLIA_RPC_URL, HEDERA_TESTNET_RPC_URL)"
	@echo "  Step 1 deploy Hedera HTS via ITS: make axelar-deploy-hedera"
	@echo "  Step 2 deploy remote Sepolia:     make axelar-deploy-sepolia"
	@echo "  Step 3 resolve Sepolia address:   make axelar-resolve-sepolia-token"
	@echo "  Optional status:                  make axelar-status"
	@echo "  Optional mint test supply:        make axelar-mint-hedera AMOUNT=100000000000000000"
	@echo "                                    make axelar-mint-sepolia AMOUNT=100000000000000000"
	@echo "  Test Hedera -> Sepolia:           make axelar-approve-hedera AMOUNT=100000000000000000"
	@echo "                                   make axelar-send-from-hedera AMOUNT=100000000000000000 [RECIPIENT=0x...]"
	@echo "  Test Sepolia -> Hedera:           make axelar-send-from-sepolia AMOUNT=100000000000000000 [RECIPIENT=0x...]"
	@echo "  Final sync frontend config:      make bridge-sync-next PROVIDER=axelar"

axelar-deploy: axelar-deploy-hedera axelar-deploy-sepolia

axelar-deploy-sepolia:
	@cd "$(FOUNDRY_DIR)" && bash "$(BRIDGE_AXELAR_SH)" deploy-remote-sepolia

axelar-deploy-hedera:
	@cd "$(FOUNDRY_DIR)" && bash "$(BRIDGE_AXELAR_SH)" deploy-hedera

axelar-deploy-remote-sepolia:
	@cd "$(FOUNDRY_DIR)" && bash "$(BRIDGE_AXELAR_SH)" deploy-remote-sepolia

axelar-resolve-hedera-token:
	@cd "$(FOUNDRY_DIR)" && bash "$(BRIDGE_AXELAR_SH)" resolve-hedera-token

axelar-resolve-sepolia-token:
	@cd "$(FOUNDRY_DIR)" && bash "$(BRIDGE_AXELAR_SH)" resolve-sepolia-token

axelar-fund-whbar-hedera:
	@cd "$(FOUNDRY_DIR)" && bash "$(BRIDGE_AXELAR_SH)" fund-whbar-hedera

axelar-mint-hedera:
	@cd "$(FOUNDRY_DIR)" && AMOUNT="$(AMOUNT)" RECIPIENT="$(RECIPIENT)" bash "$(BRIDGE_AXELAR_SH)" mint-hedera

axelar-mint-sepolia:
	@cd "$(FOUNDRY_DIR)" && AMOUNT="$(AMOUNT)" RECIPIENT="$(RECIPIENT)" bash "$(BRIDGE_AXELAR_SH)" mint-sepolia

axelar-status:
	@cd "$(FOUNDRY_DIR)" && bash "$(BRIDGE_AXELAR_SH)" status

axelar-approve-hedera:
	@cd "$(FOUNDRY_DIR)" && AMOUNT="$(AMOUNT)" bash "$(BRIDGE_AXELAR_SH)" approve-hedera

axelar-send-from-sepolia:
	@cd "$(FOUNDRY_DIR)" && AMOUNT="$(AMOUNT)" RECIPIENT="$(RECIPIENT)" bash "$(BRIDGE_AXELAR_SH)" send-from-sepolia

axelar-send-from-hedera:
	@cd "$(FOUNDRY_DIR)" && AMOUNT="$(AMOUNT)" RECIPIENT="$(RECIPIENT)" bash "$(BRIDGE_AXELAR_SH)" send-from-hedera
