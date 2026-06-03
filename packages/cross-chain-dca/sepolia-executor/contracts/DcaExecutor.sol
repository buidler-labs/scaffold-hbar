// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/ISwapRouter.sol";
import "./interfaces/IDcaHandler.sol";

/// @title DcaExecutor
/// @notice Implements IDcaHandler by swapping source tokens for a target token via Uniswap v3.
///
///         This contract is intentionally unaware of Axelar or any other bridge — it only
///         executes swaps when called by the authorized AxelarMessageReceiver.
///
///         Deployment order:
///           1. Deploy DcaExecutor.
///           2. Deploy AxelarMessageReceiver(..., address(dcaExecutor)).
///           3. Call dcaExecutor.setAuthorizedCaller(receiverAddress).
///           4. Pre-fund DcaExecutor with source tokens so swaps have liquidity.
contract DcaExecutor is IDcaHandler {
    uint24 public constant POOL_FEE = 3000; // Uniswap v3 0.3% tier

    ISwapRouter public immutable swapRouter;
    IERC20 public immutable sourceToken;

    address public owner;
    address public authorizedCaller;

    event SwapExecuted(
        uint256 indexed planId,
        uint256 amountIn,
        uint256 amountOut,
        address indexed tokenOut
    );
    event AuthorizedCallerSet(address indexed caller);

    constructor(address _swapRouter, address _sourceToken) {
        require(_swapRouter != address(0), "DcaExecutor: zero swap router");
        require(_sourceToken != address(0), "DcaExecutor: zero source token");
        swapRouter = ISwapRouter(_swapRouter);
        sourceToken = IERC20(_sourceToken);
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "DcaExecutor: not owner");
        _;
    }

    receive() external payable {}

    function setAuthorizedCaller(address caller) external onlyOwner {
        require(caller != address(0), "DcaExecutor: zero address");
        authorizedCaller = caller;
        emit AuthorizedCallerSet(caller);
    }

    function withdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "DcaExecutor: nothing to withdraw");
        (bool ok, ) = owner.call{value: balance}("");
        require(ok, "DcaExecutor: ETH withdraw failed");
    }

    function withdrawToken(address token) external onlyOwner {
        require(token != address(0), "DcaExecutor: zero token address");
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "DcaExecutor: nothing to withdraw");
        require(IERC20(token).transfer(owner, balance), "DcaExecutor: token transfer failed");
    }

    /// @inheritdoc IDcaHandler
    function handleDcaExecution(
        uint256 planId,
        uint256 amountIn,
        address tokenOut,
        uint256 minAmountOut
    ) external override {
        require(msg.sender == authorizedCaller, "DcaExecutor: not authorized");
        _executeSwap(planId, amountIn, tokenOut, minAmountOut);
    }

    function _executeSwap(
        uint256 planId,
        uint256 amountIn,
        address tokenOut,
        uint256 minAmountOut
    ) internal {
        sourceToken.approve(address(swapRouter), amountIn);

        uint256 amountOut = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn:           address(sourceToken),
                tokenOut:          tokenOut,
                fee:               POOL_FEE,
                recipient:         address(this),
                deadline:          block.timestamp + 300,
                amountIn:          amountIn,
                amountOutMinimum:  minAmountOut,
                sqrtPriceLimitX96: 0
            })
        );

        emit SwapExecuted(planId, amountIn, amountOut, tokenOut);
    }
}
