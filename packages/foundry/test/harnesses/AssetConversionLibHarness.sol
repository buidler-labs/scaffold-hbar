// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { AssetConversionLib } from "../../contracts/oracle/lib/AssetConversionLib.sol";

contract AssetConversionLibHarness {
    function baseToQuote(uint256 baseAmount, uint8 baseDecimals, uint8 quoteDecimals, uint256 priceE18)
        external
        pure
        returns (uint256)
    {
        return AssetConversionLib.baseToQuote(baseAmount, baseDecimals, quoteDecimals, priceE18);
    }

    function quoteToBase(uint256 quoteAmount, uint8 baseDecimals, uint8 quoteDecimals, uint256 priceE18)
        external
        pure
        returns (uint256)
    {
        return AssetConversionLib.quoteToBase(quoteAmount, baseDecimals, quoteDecimals, priceE18);
    }
}
