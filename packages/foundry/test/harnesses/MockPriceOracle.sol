// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { IPriceOracle } from "../../contracts/oracle/interfaces/IPriceOracle.sol";

contract MockPriceOracle is IPriceOracle {
    PriceData private priceData;

    constructor(bytes32 pairKey, bytes32 providerKey, uint256 priceE18, uint256 updatedAt) {
        priceData = PriceData({ pairKey: pairKey, providerKey: providerKey, priceE18: priceE18, updatedAt: updatedAt });
    }

    function setPriceData(bytes32 pairKey, bytes32 providerKey, uint256 priceE18, uint256 updatedAt) external {
        priceData = PriceData({ pairKey: pairKey, providerKey: providerKey, priceE18: priceE18, updatedAt: updatedAt });
    }

    function latestPrice() external view returns (PriceData memory data) {
        return priceData;
    }
}
