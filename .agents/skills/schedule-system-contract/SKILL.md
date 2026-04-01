---
name: Schedule Service System Contract Skill
description: Hedera Schedule Service (HSS) smart contract development. Use when creating or interacting with scheduled transactions from Solidity via the Schedule Service system contract at 0x16b (e.g. scheduleNative for token creation, scheduleCall for generalized contract calls, authorizeSchedule, signSchedule, deleteSchedule, or querying scheduled token info).
---

# Hedera Schedule Service (HSS) System Contract

The Hedera Schedule Service system contract at **`0x16b`** exposes functions for creating and managing scheduled transactions from within Solidity. It supports:

- **HIP-755**: Authorizing and signing schedules from contracts
- **HIP-756**: Scheduling native HTS token creation (createFungibleToken, createNonFungibleToken, etc.)
- **HIP-1215**: Generalized scheduled contract calls — schedule arbitrary calls to any contract (or self) for DeFi automation, vesting, DAO operations

## Quick Reference

**Contract address:** `0x16b`

**Imports:**

```solidity
import {IHederaScheduleService} from "@hashgraph/smart-contracts/contracts/system-contracts/hedera-schedule-service/IHederaScheduleService.sol";
import {IHRC1215ScheduleFacade} from "@hashgraph/smart-contracts/contracts/system-contracts/hedera-schedule-service/IHRC1215ScheduleFacade.sol";
import {IHederaTokenService} from "@hashgraph/smart-contracts/contracts/system-contracts/hedera-token-service/IHederaTokenService.sol";
import {HederaResponseCodes} from "@hashgraph/smart-contracts/contracts/system-contracts/hedera-token-service/HederaResponseCodes.sol";
```

**Response codes:** SUCCESS = 22 (`HederaResponseCodes.SUCCESS`). See [references/api.md](references/api.md) for full function list and [Hedera response codes](https://github.com/hashgraph/hedera-protobufs/blob/main/services/response_code.proto).

## Critical: Non-Reverting Behavior (HIP-1215)

The `scheduleCall`, `scheduleCallWithPayer`, and `executeCallOnPayerSignature` functions **do not revert**. On failure they return `(responseCode, address(0))`. Always check:

```solidity
(int64 rc, address scheduleAddr) = IHederaScheduleService(HSS_ADDRESS).scheduleCall(...);
require(rc == HederaResponseCodes.SUCCESS, "Schedule failed");
require(scheduleAddr != address(0), "No schedule created");
```

## Capacity and Throttling (HIP-1215)

Scheduled calls are throttled per second. Use `hasScheduleCapacity(expirySecond, gasLimit)` before scheduling to avoid `SCHEDULE_EXPIRY_IS_BUSY`:

```solidity
if (!IHederaScheduleService(HSS_ADDRESS).hasScheduleCapacity(expirySecond, gasLimit)) {
    // Retry with a later expiry or different gas limit
    // See HIP-1215 findAvailableSecond() pattern for exponential backoff + jitter
}
```

## Common Concepts

- **Scheduled transaction**: Wraps a Hedera transaction (native HTS call or EVM contract call) for deferred execution when signature thresholds are met.
- **Payer**: Account responsible for paying fees. With `scheduleCall`, the calling contract is the payer. With `scheduleCallWithPayer` / `executeCallOnPayerSignature`, a separate payer can be specified.
- **authorizeSchedule**: Signs the schedule with the calling contract's key (ContractKey format `0.0.<ContractId>`).
- **signSchedule**: Adds protobuf-encoded signatures from EOAs or other keys.
- **Expiration**: Schedules that fail to collect all required signatures before `expirySecond` are automatically removed from the network.

## Usage Patterns

### Schedule Native Token Creation (HIP-756)

> **Note:** The payer must have sufficient HBAR when the schedule executes (for the token creation fee).

```solidity
address HTS = 0x167;
address HSS = 0x16b;

function scheduleTokenCreate(
    IHederaTokenService.HederaToken memory token,
    int64 initialSupply,
    int32 decimals,
    address payer
) external returns (address scheduleAddr) {
    bytes memory callData = abi.encodeCall(
        IHederaTokenService.createFungibleToken,
        (token, initialSupply, decimals)
    );
    (int64 rc, scheduleAddr) = IHederaScheduleService(HSS).scheduleNative(
        HTS, callData, payer
    );
    require(rc == HederaResponseCodes.SUCCESS, "Schedule failed");
}
```

### Schedule Arbitrary Contract Call (HIP-1215)

```solidity
function scheduleFutureCall(
    address target,
    uint256 expirySecond,
    uint256 gasLimit,
    bytes memory callData
) external returns (address scheduleAddr) {
    require(
        IHederaScheduleService(HSS).hasScheduleCapacity(expirySecond, gasLimit),
        "No capacity"
    );
    (int64 rc, scheduleAddr) = IHederaScheduleService(HSS).scheduleCall(
        target, expirySecond, gasLimit, 0, callData
    );
    require(rc == HederaResponseCodes.SUCCESS && scheduleAddr != address(0), "Schedule failed");
}
```

### Contract Signs Schedule (HIP-755)

```solidity
function signAsContract(address scheduleAddr) external {
    int64 rc = IHederaScheduleService(HSS).authorizeSchedule(scheduleAddr);
    require(rc == HederaResponseCodes.SUCCESS, "Authorize failed");
}
```

### Delete Schedule

```solidity
// Option 1: Call deleteSchedule(address) on HSS
int64 rc = IHederaScheduleService(HSS).deleteSchedule(scheduleAddr);

// Option 2: Redirect — call deleteSchedule() on the schedule's address
// (works for contracts and EOAs; use IHRC1215ScheduleFacade)
rc = IHRC1215ScheduleFacade(scheduleAddr).deleteSchedule();
```

## Costs

- Schedule transaction fees match HAPI ScheduleCreate, with a **20% markup** for system contract usage.
- Includes gas, storage, and consensus fees. Expired transactions incur no extra fees beyond initial scheduling/signature costs.

## References

- **API Reference**: [references/api.md](references/api.md) — Full function signatures, selectors, and usage notes
- **HIP-755**: [Schedule Service System Contract](https://hips.hedera.com/hip/hip-755)
- **HIP-756**: [Contract Scheduled Token Create](https://hips.hedera.com/hip/hip-756)
- **HIP-1215**: [Generalized Scheduled Contract Calls](https://hips.hedera.com/hip/hip-1215)
- **Source**: [hedera-smart-contracts/hedera-schedule-service](https://github.com/hashgraph/hedera-smart-contracts/tree/main/contracts/system-contracts/hedera-schedule-service)
