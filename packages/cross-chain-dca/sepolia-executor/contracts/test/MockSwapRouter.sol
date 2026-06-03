// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/ISwapRouter.sol";

/// @dev Records swap calls and optionally returns mock output tokens.
contract MockSwapRouter {
    address public lastTokenIn;
    address public lastTokenOut;
    uint256 public lastAmountIn;
    uint256 public lastAmountOutMinimum;
    address public lastRecipient;
    uint256 public callCount;

    uint256 private _mockAmountOut;

    function setMockAmountOut(uint256 amount) external {
        _mockAmountOut = amount;
    }

    function exactInputSingle(ISwapRouter.ExactInputSingleParams calldata params)
        external
        payable
        returns (uint256)
    {
        lastTokenIn = params.tokenIn;
        lastTokenOut = params.tokenOut;
        lastAmountIn = params.amountIn;
        lastAmountOutMinimum = params.amountOutMinimum;
        lastRecipient = params.recipient;
        callCount++;

        IERC20(params.tokenIn).transferFrom(msg.sender, address(this), params.amountIn);
        return _mockAmountOut;
    }
}
