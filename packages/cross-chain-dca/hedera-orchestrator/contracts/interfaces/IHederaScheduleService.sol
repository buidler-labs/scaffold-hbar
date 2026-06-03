// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IHederaScheduleService
/// @notice Interface for the Hedera Schedule Service system contract at address 0x16b.
/// @dev HIP-755 (authorizeSchedule), HIP-756 (scheduleNative), HIP-1215 (scheduleCall).
///      The primary function used by DcaOrchestrator is scheduleCall (HIP-1215),
///      which auto-executes at expirySecond without any off-chain signing.
interface IHederaScheduleService {
    /// @notice Schedule a contract call. The calling contract is the payer.
    ///         The Hedera network automatically executes the call at expirySecond.
    /// @param to          Target contract address.
    /// @param expirySecond Unix timestamp at which the scheduled call fires.
    /// @param gasLimit    Gas limit for the scheduled call.
    /// @param value       HBAR amount to send with the call (in tinybars). Usually 0.
    /// @param callData    ABI-encoded function call.
    /// @return responseCode   22 (SUCCESS) on success.
    /// @return scheduleAddress Hedera EVM address of the created schedule entity.
    function scheduleCall(
        address to,
        uint256 expirySecond,
        uint256 gasLimit,
        uint64 value,
        bytes calldata callData
    ) external returns (int64 responseCode, address scheduleAddress);

    /// @notice Schedule a call specifying a separate payer account.
    function scheduleCallWithPayer(
        address to,
        address payer,
        uint256 expirySecond,
        uint256 gasLimit,
        uint64 value,
        bytes calldata callData
    ) external returns (int64 responseCode, address scheduleAddress);

    /// @notice Authorize (sign) an existing scheduled transaction.
    function authorizeSchedule(address schedule) external returns (int64 responseCode);

    /// @notice Check whether the network has capacity to accept a new scheduled call.
    function hasScheduleCapacity(uint256 expirySecond, uint256 gasLimit) external view returns (bool);
}
