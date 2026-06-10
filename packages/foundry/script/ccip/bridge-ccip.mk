# CCIP CCT — deploy/configure/send wrappers (see bridge-ccip.sh); included from Makefile
.PHONY: ccip-help ccip-deploy ccip-deploy-sepolia ccip-deploy-hedera ccip-deploy-hedera-hts ccip-configure-sepolia ccip-configure-hedera ccip-associate-hedera ccip-approve-hedera-hts ccip-send-from-sepolia ccip-send-from-hedera ccip-send-from-hedera-hts

BRIDGE_CCIP_SH := $(FOUNDRY_DIR)/script/ccip/bridge-ccip.sh
DEPLOY_HEDERA_HTS_SH := $(FOUNDRY_DIR)/script/ccip/deploy-hedera-hts.sh

ccip-help:
	@echo "CCIP CCT tutorial (needs packages/foundry/.env: ACCOUNT, SEPOLIA_RPC_URL, HEDERA_TESTNET_RPC_URL)"
	@echo "  Step 1 deploy vanilla route:     make ccip-deploy"
	@echo "    or deploy separately:          make ccip-deploy-sepolia"
	@echo "                                   make ccip-deploy-hedera"
	@echo "  Optional HTS Hedera deploy:      make ccip-deploy-hedera-hts"
	@echo "  Step 2 configure pools:          make ccip-configure-sepolia"
	@echo "                                   make ccip-configure-hedera"
	@echo "  Optional HTS association:        make ccip-associate-hedera [RECIPIENT=0x...]"
	@echo "  Optional HTS approval:           make ccip-approve-hedera-hts AMOUNT=1000000000"
	@echo "  Step 3 test Sepolia -> Hedera:   make ccip-send-from-sepolia AMOUNT=1000000000 [RECIPIENT=0x...]"
	@echo "  Step 4 test Hedera -> Sepolia:   make ccip-send-from-hedera AMOUNT=1000000000 [RECIPIENT=0x...]"
	@echo "  HTS-backed Hedera send:          make ccip-send-from-hedera-hts AMOUNT=1000000000 [RECIPIENT=0x...]"
	@echo "  Final sync frontend config:      make bridge-sync-next PROVIDER=ccip"
	@echo "Or: bash script/ccip/bridge-ccip.sh deploy-sepolia"

ccip-deploy: ccip-deploy-sepolia ccip-deploy-hedera

ccip-deploy-sepolia:
	@cd "$(FOUNDRY_DIR)" && bash "$(BRIDGE_CCIP_SH)" deploy-sepolia

ccip-deploy-hedera:
	@cd "$(FOUNDRY_DIR)" && bash "$(BRIDGE_CCIP_SH)" deploy-hedera

ccip-deploy-hedera-hts:
	@cd "$(FOUNDRY_DIR)" && bash "$(DEPLOY_HEDERA_HTS_SH)"

ccip-configure-sepolia:
	@cd "$(FOUNDRY_DIR)" && bash "$(BRIDGE_CCIP_SH)" configure-sepolia

ccip-configure-hedera:
	@cd "$(FOUNDRY_DIR)" && bash "$(BRIDGE_CCIP_SH)" configure-hedera

ccip-associate-hedera:
	@cd "$(FOUNDRY_DIR)" && RECIPIENT="$(RECIPIENT)" bash "$(BRIDGE_CCIP_SH)" associate-hedera

ccip-approve-hedera-hts:
	@cd "$(FOUNDRY_DIR)" && AMOUNT="$(AMOUNT)" bash "$(BRIDGE_CCIP_SH)" approve-hedera-hts

ccip-send-from-sepolia:
	@cd "$(FOUNDRY_DIR)" && AMOUNT="$(AMOUNT)" RECIPIENT="$(RECIPIENT)" bash "$(BRIDGE_CCIP_SH)" send-from-sepolia

ccip-send-from-hedera:
	@cd "$(FOUNDRY_DIR)" && AMOUNT="$(AMOUNT)" RECIPIENT="$(RECIPIENT)" bash "$(BRIDGE_CCIP_SH)" send-from-hedera

ccip-send-from-hedera-hts:
	@cd "$(FOUNDRY_DIR)" && AMOUNT="$(AMOUNT)" RECIPIENT="$(RECIPIENT)" bash "$(BRIDGE_CCIP_SH)" send-from-hedera-hts
