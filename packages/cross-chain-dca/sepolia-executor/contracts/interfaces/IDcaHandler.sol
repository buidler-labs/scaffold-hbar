// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IDcaHandler
/// @notice Abstraction over the DCA business logic that executes once a cross-chain
///         message has been received and decoded.
///         Decouples the bridge transport layer (e.g. Axelar) from the swap execution
///         logic (e.g. Uniswap v3) — the receiver calls this interface; the handler
///         knows nothing about how the message arrived.
interface IDcaHandler {
    /// @notice Execute one DCA cycle: swap `amountIn` of source token for `tokenOut`.
    /// @param planId    Identifier of the DCA plan that triggered this execution.
    /// @param amountIn  Amount of source tokens to swap (in token base units).
    /// @param tokenOut  Address of the token to purchase.
    /// @param minAmountOut Minimum output tokens the swap must return; reverts otherwise.
    function handleDcaExecution(
        uint256 planId,
        uint256 amountIn,
        address tokenOut,
        uint256 minAmountOut
    ) external;
}
