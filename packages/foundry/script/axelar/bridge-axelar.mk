# Axelar — deploy wrappers (see bridge-axelar.sh); included from Makefile
.PHONY: axelar-help axelar-deploy-sepolia axelar-deploy-hedera axelar-verify-sepolia axelar-verify-hedera axelar-metadata-sepolia axelar-metadata-hedera axelar-register-custom axelar-link-remote axelar-transfer-mintership-sepolia axelar-approve-hedera axelar-send-from-sepolia axelar-send-from-hedera

BRIDGE_AXELAR_SH := $(FOUNDRY_DIR)/script/axelar/bridge-axelar.sh

axelar-help:
	@echo "Deploy / verify / ITS metadata (needs packages/foundry/.env: ACCOUNT, …)"
	@echo "  make axelar-deploy-sepolia"
	@echo "  make axelar-deploy-hedera"
	@echo "  make axelar-verify-sepolia ADDR=0x..."
	@echo "  make axelar-verify-hedera ADDR=0x..."
	@echo "  make axelar-metadata-sepolia"
	@echo "  make axelar-metadata-hedera"
	@echo "  make axelar-register-custom"
	@echo "  make axelar-link-remote"
	@echo "  make axelar-transfer-mintership-sepolia"
	@echo "  make axelar-approve-hedera AMOUNT=1000000000000000000"
	@echo "  make axelar-send-from-sepolia AMOUNT=1000000000000000000 [RECIPIENT=0x...]"
	@echo "  make axelar-send-from-hedera AMOUNT=1000000000000000000 [RECIPIENT=0x...]"
	@echo "Or: bash script/axelar/bridge-axelar.sh verify-sepolia 0x..."

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
