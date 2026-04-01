// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import { IExecutionStrategy } from "../interfaces/IExecutionStrategy.sol";
import { IMemeJob } from "../interfaces/IMemejob.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title MemejobDCAStrategy
 * @notice Example IExecutionStrategy plugin that DCA-buys or DCA-sells MemeJob tokens.
 *         The vault calls plan() to get the list of actions, then executes them as msg.sender.
 *         BUY:  1 action  – buyJob{value}(token, amount, referrer)
 *         SELL: 2 actions – approve(memejob, amount) then sellJob(token, amount)
 */
contract MemejobDCAStrategy is IExecutionStrategy {
    error MemejobDCAStrategy__SlippageExceeded(uint256 quoted, uint256 maxHbarIn);
    error MemejobDCAStrategy__InsufficientVaultBalance(uint256 required, uint256 available);

    /// @notice Configuration for the Memejob DCA strategy.
    struct DcaConfig {
        /// @dev The MemeJob contract address
        address memejob;
        /// @dev The MemeToken contract address
        address memeToken;
        /// @dev Whether to buy or sell
        bool isBuy;
        /// @dev The amount of tokens to buy or sell per run
        uint256 amountPerRun;
        /// @dev The maximum HBAR cost for a buy, 0 for sell
        uint256 maxHbarIn;
    }

    /// @inheritdoc IExecutionStrategy
    function plan(bytes calldata _config) external view override returns (Action[] memory) {
        DcaConfig memory config = abi.decode(_config, (DcaConfig));
        return config.isBuy ? _planBuy(config) : _planSell(config);
    }

    /// @inheritdoc IExecutionStrategy
    function validateConfig(bytes calldata config) external pure override returns (bool) {
        DcaConfig memory c = abi.decode(config, (DcaConfig));
        if (c.memejob == address(0)) return false;
        if (c.memeToken == address(0)) return false;
        if (c.amountPerRun == 0) return false;
        if (c.isBuy && c.maxHbarIn == 0) return false;
        return true;
    }

    /*//////////////////////////////////////////////////////////////
                            PLAN BUILDERS
    //////////////////////////////////////////////////////////////*/

    function _planBuy(DcaConfig memory _config) internal view returns (Action[] memory actions) {
        uint256 hbarCost = IMemeJob(_config.memejob)
            .getAmountOut(_config.memeToken, _config.amountPerRun, IMemeJob.TransactionType.BuyInTokens);
        if (hbarCost > _config.maxHbarIn) revert MemejobDCAStrategy__SlippageExceeded(hbarCost, _config.maxHbarIn);
        if (msg.sender.balance < hbarCost) {
            revert MemejobDCAStrategy__InsufficientVaultBalance(hbarCost, msg.sender.balance);
        }

        actions = new Action[](1);
        actions[0] = Action({
            target: _config.memejob,
            value: hbarCost,
            data: abi.encodeCall(IMemeJob.buyJob, (_config.memeToken, _config.amountPerRun, address(0)))
        });
    }

    function _planSell(DcaConfig memory _config) internal view returns (Action[] memory actions) {
        uint256 tokenBalance = IERC20(_config.memeToken).balanceOf(msg.sender);
        if (tokenBalance < _config.amountPerRun) {
            revert MemejobDCAStrategy__InsufficientVaultBalance(_config.amountPerRun, tokenBalance);
        }

        actions = new Action[](2);
        actions[0] = Action({
            target: _config.memeToken,
            value: 0,
            data: abi.encodeCall(IERC20.approve, (_config.memejob, _config.amountPerRun))
        });
        actions[1] = Action({
            target: _config.memejob,
            value: 0,
            data: abi.encodeCall(IMemeJob.sellJob, (_config.memeToken, _config.amountPerRun))
        });
    }
}
