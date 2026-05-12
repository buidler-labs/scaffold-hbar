# Axelar — Hedera ITS helpers (see bridge-axelar.sh); included from Makefile
.PHONY: axelar-help axelar-deploy axelar-deploy-sepolia axelar-deploy-hedera axelar-deploy-remote-sepolia axelar-resolve-hedera-token axelar-resolve-sepolia-token axelar-fund-whbar-hedera axelar-mint-hedera axelar-mint-sepolia axelar-status axelar-deploy-sepolia-custom axelar-deploy-hedera-wrapper axelar-verify-sepolia axelar-verify-hedera axelar-metadata-sepolia axelar-metadata-hedera axelar-register-custom axelar-link-remote axelar-transfer-mintership-sepolia axelar-approve-hedera axelar-send-from-sepolia axelar-send-from-hedera

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
	@echo "  Legacy custom flow:              make axelar-deploy-sepolia-custom"
	@echo "                                   make axelar-deploy-hedera-wrapper"

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

axelar-deploy-sepolia-custom:
	@cd "$(FOUNDRY_DIR)" && bash "$(BRIDGE_AXELAR_SH)" deploy-sepolia-custom

axelar-deploy-hedera-wrapper:
	@cd "$(FOUNDRY_DIR)" && bash "$(BRIDGE_AXELAR_SH)" deploy-hedera-wrapper

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
