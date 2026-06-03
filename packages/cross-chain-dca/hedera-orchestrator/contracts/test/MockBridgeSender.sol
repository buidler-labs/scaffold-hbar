// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IBridgeSender.sol";

/// @dev Test double for IBridgeSender.
contract MockBridgeSender is IBridgeSender {
    uint256 public callCount;
    uint256 public lastPlanId;
    uint256 public lastAmountPerExecution;
    address public lastTargetToken;
    uint256 public lastMinAmountOut;

    function send(
        uint256 planId,
        uint256 amountPerExecution,
        address targetToken,
        uint256 minAmountOut
    ) external payable override {
        callCount++;
        lastPlanId = planId;
        lastAmountPerExecution = amountPerExecution;
        lastTargetToken = targetToken;
        lastMinAmountOut = minAmountOut;
    }
}
