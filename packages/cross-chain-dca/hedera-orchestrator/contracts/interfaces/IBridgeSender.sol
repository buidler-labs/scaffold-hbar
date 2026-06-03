// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IBridgeSender
/// @notice Abstraction over the cross-chain bridge used to dispatch DCA execution messages.
///         Decouples orchestration logic from the specific bridge provider (e.g. Axelar).
///         The implementation is responsible for managing its own gas funds and routing.
interface IBridgeSender {
    /// @notice Send a DCA execution message to the destination chain.
    /// @param planId             Identifier of the DCA plan being executed.
    /// @param amountPerExecution Amount of source tokens to swap in this cycle.
    /// @param targetToken        Address of the token to purchase on the destination chain.
    /// @param minAmountOut       Minimum output tokens the swap must return; reverts otherwise.
    function send(
        uint256 planId,
        uint256 amountPerExecution,
        address targetToken,
        uint256 minAmountOut
    ) external payable;
}
