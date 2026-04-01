// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

/**
 * @title IMemeJob
 * @notice Interface for MemeJob Contract
 * @dev Testnet: 0xa3bf9adec2fb49fb65c8948aed71c6bf1c4d61c8
 *      Mainnet: 0x950230ea77dc168df543609c2349c87dea57e876
 */
interface IMemeJob {
    enum TransactionType {
        BuyInTokens, // 0
        SellInTokens, // 1
        BuyInHbar, // 2
        SellInHbar // 3
    }

    /**
     * @notice Buy tokens
     * @param memeAddress EVM address of the meme token
     * @param amount Amount of tokens to buy (in token's smallest unit, 8 decimals)
     * @param referrer Referral address (use address(0) for none)
     */
    function buyJob(address memeAddress, uint256 amount, address referrer) external payable;

    /**
     * @notice Sell tokens
     * @param memeAddress EVM address of the meme token
     * @param amount Amount of tokens to sell
     * @dev Caller must have approved this contract to spend tokens via HTS allowance
     */
    function sellJob(address memeAddress, uint256 amount) external;

    /**
     * @notice Get HBAR cost for buying or HBAR output for selling
     * @param _memeAddress Token address
     * @param _amount Token amount
     * @param _txType TransactionType enum:
     * - BuyInTokens / SellInTokens (amount in tokens, returns HBAR)
     * - BuyInHbar / SellInHbar (amount in HBAR, returns tokens)
     */
    function getAmountOut(address _memeAddress, uint256 _amount, TransactionType _txType)
        external
        view
        returns (uint256 value);
}
