# LayerZero — Chapter 1 OFT flow wrappers (see bridge-layerzero.sh)
.PHONY: layerzero-help layerzero-deploy-sepolia layerzero-deploy-hedera layerzero-deploy-workers-sepolia layerzero-deploy-workers-hedera layerzero-wire-sepolia layerzero-wire-hedera layerzero-verify-wiring layerzero-send-from-sepolia layerzero-send-from-hedera layerzero-relay layerzero-balances

BRIDGE_LAYERZERO_SH := $(FOUNDRY_DIR)/script/layerzero/bridge-layerzero.sh

layerzero-help:
	@echo "LayerZero commands:"
	@echo "  make layerzero-deploy-sepolia"
	@echo "  make layerzero-deploy-hedera"
	@echo "  make layerzero-deploy-workers-sepolia"
	@echo "  make layerzero-deploy-workers-hedera"
	@echo "  make layerzero-wire-sepolia"
	@echo "  make layerzero-wire-hedera"
	@echo "  make layerzero-verify-wiring"
	@echo "  make layerzero-send-from-sepolia AMOUNT=10000000000000000 [RECIPIENT=0x...]"
	@echo "  make layerzero-send-from-hedera AMOUNT=10000000000000000 [RECIPIENT=0x...]"
	@echo "  make layerzero-relay DIRECTION=sepolia-to-hedera TX=0x..."
	@echo "  make layerzero-balances"

layerzero-deploy-sepolia:
	@cd "$(FOUNDRY_DIR)" && bash "$(BRIDGE_LAYERZERO_SH)" deploy-sepolia

layerzero-deploy-hedera:
	@cd "$(FOUNDRY_DIR)" && bash "$(BRIDGE_LAYERZERO_SH)" deploy-hedera

layerzero-deploy-workers-sepolia:
	@cd "$(FOUNDRY_DIR)" && bash "$(BRIDGE_LAYERZERO_SH)" deploy-workers-sepolia

layerzero-deploy-workers-hedera:
	@cd "$(FOUNDRY_DIR)" && bash "$(BRIDGE_LAYERZERO_SH)" deploy-workers-hedera

layerzero-wire-sepolia:
	@cd "$(FOUNDRY_DIR)" && bash "$(BRIDGE_LAYERZERO_SH)" wire-sepolia

layerzero-wire-hedera:
	@cd "$(FOUNDRY_DIR)" && bash "$(BRIDGE_LAYERZERO_SH)" wire-hedera

layerzero-verify-wiring:
	@cd "$(FOUNDRY_DIR)" && bash "$(BRIDGE_LAYERZERO_SH)" verify-wiring

layerzero-send-from-sepolia:
	@cd "$(FOUNDRY_DIR)" && AMOUNT="$${AMOUNT:-$(AMOUNT)}" RECIPIENT="$${RECIPIENT:-$(RECIPIENT)}" bash "$(BRIDGE_LAYERZERO_SH)" send-from-sepolia

layerzero-send-from-hedera:
	@cd "$(FOUNDRY_DIR)" && AMOUNT="$${AMOUNT:-$(AMOUNT)}" RECIPIENT="$${RECIPIENT:-$(RECIPIENT)}" bash "$(BRIDGE_LAYERZERO_SH)" send-from-hedera

layerzero-relay:
	@cd "$(FOUNDRY_DIR)" && TX="$${TX:-$(TX)}" DIRECTION="$${DIRECTION:-$(DIRECTION)}" bash "$(BRIDGE_LAYERZERO_SH)" relay

layerzero-balances:
	@cd "$(FOUNDRY_DIR)" && ACCOUNT="$${ACCOUNT:-$(ACCOUNT)}" bash "$(BRIDGE_LAYERZERO_SH)" balances
