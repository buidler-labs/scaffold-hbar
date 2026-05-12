# LayerZero — Chapter 1 OFT flow wrappers (see bridge-layerzero.sh)
.PHONY: layerzero-help layerzero-deploy layerzero-deploy-sepolia layerzero-deploy-hedera layerzero-deploy-workers-sepolia layerzero-deploy-workers-hedera layerzero-wire-sepolia layerzero-wire-hedera layerzero-verify-wiring layerzero-send-from-sepolia layerzero-send-from-hedera layerzero-relay layerzero-balances

BRIDGE_LAYERZERO_SH := $(FOUNDRY_DIR)/script/layerzero/bridge-layerzero.sh

layerzero-help:
	@echo "LayerZero OFT tutorial (needs packages/foundry/.env: ACCOUNT, SEPOLIA_RPC_URL, HEDERA_TESTNET_RPC_URL)"
	@echo "  Step 1 deploy OFTs/workers:      make layerzero-deploy"
	@echo "    or deploy separately:          make layerzero-deploy-sepolia"
	@echo "                                   make layerzero-deploy-hedera"
	@echo "                                   make layerzero-deploy-workers-sepolia"
	@echo "                                   make layerzero-deploy-workers-hedera"
	@echo "  Step 2 wire both chains:         make layerzero-wire-sepolia"
	@echo "                                   make layerzero-wire-hedera"
	@echo "  Step 3 verify wiring:            make layerzero-verify-wiring"
	@echo "  Step 4 test Sepolia -> Hedera:   make layerzero-send-from-sepolia AMOUNT=10000000000000000 [RECIPIENT=0x...]"
	@echo "                                   make layerzero-relay DIRECTION=sepolia-to-hedera TX=0x..."
	@echo "  Step 5 test Hedera -> Sepolia:   make layerzero-send-from-hedera AMOUNT=10000000000000000 [RECIPIENT=0x...]"
	@echo "                                   make layerzero-relay DIRECTION=hedera-to-sepolia TX=0x..."
	@echo "  Optional balances:               make layerzero-balances"
	@echo "  Final sync frontend config:      make bridge-sync-next PROVIDER=layerzero"

layerzero-deploy: layerzero-deploy-sepolia layerzero-deploy-hedera layerzero-deploy-workers-sepolia layerzero-deploy-workers-hedera

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
