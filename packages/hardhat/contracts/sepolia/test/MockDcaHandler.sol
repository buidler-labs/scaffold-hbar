// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IDcaHandler.sol";

/// @dev Test double for IDcaHandler.
contract MockDcaHandler is IDcaHandler {
    uint256 public callCount;
    uint256 public lastPlanId;
    uint256 public lastAmountIn;
    address public lastTokenOut;
    uint256 public lastMinAmountOut;

    function handleDcaExecution(
        uint256 planId,
        uint256 amountIn,
        address tokenOut,
        uint256 minAmountOut
    ) external override {
        callCount++;
        lastPlanId = planId;
        lastAmountIn = amountIn;
        lastTokenOut = tokenOut;
        lastMinAmountOut = minAmountOut;
    }
}
