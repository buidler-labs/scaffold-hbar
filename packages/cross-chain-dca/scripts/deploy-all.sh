#!/usr/bin/env bash
set -euo pipefail

PACKAGE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# ── defaults (lowest priority — overridden by .env or exported env vars) ──────
AXELAR_GATEWAY_HEDERA="${AXELAR_GATEWAY_HEDERA:-0xe432150cce91c13a887f7D836923d5597adD8E31}"
AXELAR_GAS_SERVICE_HEDERA="${AXELAR_GAS_SERVICE_HEDERA:-0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6}"
AXELAR_DESTINATION_CHAIN_NAME="${AXELAR_DESTINATION_CHAIN_NAME:-ethereum-sepolia}"
AXELAR_SOURCE_CHAIN_NAME="${AXELAR_SOURCE_CHAIN_NAME:-hedera}"
UNISWAP_ROUTER="${UNISWAP_ROUTER:-0x65669fE35312947050C450Bd5d36e6361F85eC12}"
USDC_ADDRESS="${USDC_ADDRESS:-0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238}"
ORCHESTRATOR_FUND_AMOUNT="${ORCHESTRATOR_FUND_AMOUNT:-10}"
FUND_USDC_AMOUNT="${FUND_USDC_AMOUNT:-5}"
AMOUNT_PER_EXECUTION="${AMOUNT_PER_EXECUTION:-1000000}"
FEE_FOR_SENDER="${FEE_FOR_SENDER:-5}"
INTERVAL_SECONDS="${INTERVAL_SECONDS:-60}"
TARGET_TOKEN="${TARGET_TOKEN:-0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14}"
MIN_AMOUNT_OUT="${MIN_AMOUNT_OUT:-0}"
MAX_EXECUTIONS="${MAX_EXECUTIONS:-3}"

# ── .env overrides defaults above ─────────────────────────────────────────────
if [[ -f "$PACKAGE_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$PACKAGE_DIR/.env"
  set +a
fi

# ── required variable check ───────────────────────────────────────────────────
missing=()
[[ -z "${HEDERA_PRIVATE_KEY:-}" ]]      && missing+=("HEDERA_PRIVATE_KEY")
[[ -z "${SEPOLIA_PRIVATE_KEY:-}" ]]     && missing+=("SEPOLIA_PRIVATE_KEY")
[[ -z "${SEPOLIA_RPC_URL:-}" ]]         && missing+=("SEPOLIA_RPC_URL")
[[ -z "${AXELAR_GATEWAY_SEPOLIA:-}" ]]  && missing+=("AXELAR_GATEWAY_SEPOLIA")

# ── confirmation prompt ───────────────────────────────────────────────────────
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         Cross-chain DCA — Full Deployment (8 steps)          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  Steps:"
echo "    1. Compile all contracts"
echo "    2. Deploy hedera-orchestrator  (AxelarMessageSender + DcaOrchestrator)"
echo "    3. Deploy sepolia-executor     (DcaExecutor + AxelarMessageReceiver)"
echo "    4. Wire hedera-orchestrator    (set Sepolia receiver as destination)"
echo "    5. Wire sepolia-executor       (set Hedera sender as expected source)"
echo "    6. Fund DcaOrchestrator with HBAR"
echo "    7. Fund DcaExecutor with USDC"
echo "    8. Create DCA plan"
echo ""
echo "  Configuration:"
echo "    AXELAR_GATEWAY_HEDERA         = ${AXELAR_GATEWAY_HEDERA}"
echo "    AXELAR_GAS_SERVICE_HEDERA     = ${AXELAR_GAS_SERVICE_HEDERA}"
echo "    AXELAR_DESTINATION_CHAIN_NAME = ${AXELAR_DESTINATION_CHAIN_NAME}"
echo "    AXELAR_SOURCE_CHAIN_NAME      = ${AXELAR_SOURCE_CHAIN_NAME}"
echo "    AXELAR_GATEWAY_SEPOLIA        = ${AXELAR_GATEWAY_SEPOLIA:-<REQUIRED — not set>}"
echo "    UNISWAP_ROUTER                = ${UNISWAP_ROUTER}"
echo "    USDC_ADDRESS                  = ${USDC_ADDRESS}"
echo "    ORCHESTRATOR_FUND_AMOUNT      = ${ORCHESTRATOR_FUND_AMOUNT} HBAR"
echo "    FUND_USDC_AMOUNT              = ${FUND_USDC_AMOUNT} USDC"
echo "    AMOUNT_PER_EXECUTION          = ${AMOUNT_PER_EXECUTION} (base units)"
echo "    FEE_FOR_SENDER                = ${FEE_FOR_SENDER} HBAR"
echo "    INTERVAL_SECONDS              = ${INTERVAL_SECONDS}s"
echo "    TARGET_TOKEN                  = ${TARGET_TOKEN}"
echo "    MIN_AMOUNT_OUT                = ${MIN_AMOUNT_OUT}"
echo "    MAX_EXECUTIONS                = ${MAX_EXECUTIONS}"
echo ""

if [[ ${#missing[@]} -gt 0 ]]; then
  echo "  ERROR: Missing required environment variables:"
  for var in "${missing[@]}"; do
    echo "    $var"
  done
  echo ""
  echo "  Set them in packages/cross-chain-dca/.env or export them before running."
  exit 1
fi

read -r -p "Proceed with deployment to live testnets? [y/N] " confirm
case "$confirm" in
  [yY]|[yY][eE][sS]) ;;
  *) echo "Aborted."; exit 0 ;;
esac

echo ""

# ── helpers ───────────────────────────────────────────────────────────────────
step() { echo ""; echo "── $1 ───────────────────────────────────────────────"; }

cd "$PACKAGE_DIR"

# ── 1. compile ────────────────────────────────────────────────────────────────
step "1/8  Compile contracts"
yarn hedera:compile
yarn sepolia:compile

# ── 2. deploy hedera-orchestrator ─────────────────────────────────────────────
step "2/8  Deploy hedera-orchestrator"
yarn hedera:deploy

# ── 3. deploy sepolia-executor ────────────────────────────────────────────────
step "3/8  Deploy sepolia-executor"
yarn sepolia:deploy

# ── 4. wire hedera-orchestrator ───────────────────────────────────────────────
step "4/8  Wire hedera-orchestrator (set Sepolia receiver as destination)"
yarn hedera:wire

# ── 5. wire sepolia-executor ──────────────────────────────────────────────────
step "5/8  Wire sepolia-executor (set Hedera sender as expected source)"
yarn sepolia:wire

# ── 6. fund DcaOrchestrator with HBAR ────────────────────────────────────────
step "6/8  Fund DcaOrchestrator with HBAR"
yarn hedera:fund

# ── 7. fund DcaExecutor with USDC ─────────────────────────────────────────────
step "7/8  Fund DcaExecutor with USDC"
yarn sepolia:fund:usdc

# ── 8. create DCA plan ────────────────────────────────────────────────────────
step "8/8  Create DCA plan"
yarn hedera:plan:create

echo ""
echo "✔  Deployment complete."
echo ""
echo "  Next steps:"
echo "    Inspect plan:    yarn dca:hedera:plan:latest"
echo "    Check balances:  yarn dca:sepolia:balance:check"
echo "    Frontend:        yarn next:start  →  http://localhost:3000/dca"
