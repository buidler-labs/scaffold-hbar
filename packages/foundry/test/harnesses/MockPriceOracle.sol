// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { IPriceOracle } from "../../contracts/oracle/interfaces/IPriceOracle.sol";

contract MockPriceOracle is IPriceOracle {
    mapping(bytes32 pairKey => PriceData priceData) private priceDataByPair;

    constructor(bytes32 pairKey, bytes32 providerKey, uint256 priceE18, uint256 updatedAt) {
        setPriceData(pairKey, providerKey, priceE18, updatedAt);
    }

    function setPriceData(bytes32 pairKey, bytes32 providerKey, uint256 priceE18, uint256 updatedAt) public {
        priceDataByPair[pairKey] =
            PriceData({ pairKey: pairKey, providerKey: providerKey, priceE18: priceE18, updatedAt: updatedAt });
    }

    function latestPrice(bytes32 pairKey) external view returns (PriceData memory data) {
        data = priceDataByPair[pairKey];

        if (data.updatedAt == 0) {
            revert OracleUnsupportedPair(pairKey);
        }
    }
}
