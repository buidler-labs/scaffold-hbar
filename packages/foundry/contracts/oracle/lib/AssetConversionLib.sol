// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Math } from "@openzeppelin/contracts/utils/math/Math.sol";

/// @title AssetConversionLib
/// @notice Converts asset amounts using normalized 18-decimal oracle prices.
/// @dev Amounts are expressed in each asset's smallest unit. Prices are expected to represent the quote value
///      of one whole base asset, scaled by `PRICE_SCALE`.
library AssetConversionLib {
    /// @notice Zero value used for validation comparisons.
    uint256 internal constant ZERO = 0;

    /// @notice Decimal base used to derive asset unit scales.
    uint256 internal constant DECIMAL_BASE = 10;

    /// @notice Scale used by `IPriceOracle` adapters for normalized prices.
    uint256 internal constant PRICE_SCALE = 1e18;

    /// @notice Returned when a conversion is attempted with a zero price.
    error InvalidPrice();

    /// @notice Converts a base asset amount into the quote asset amount.
    /// @dev Rounds down when the conversion leaves a remainder.
    /// @param baseAmount Amount of base asset in its smallest unit.
    /// @param baseDecimals Decimal precision used by the base asset.
    /// @param quoteDecimals Decimal precision used by the quote asset.
    /// @param priceE18 Quote value of one whole base asset, scaled to 18 decimals.
    /// @return quoteAmount Amount of quote asset in its smallest unit.
    function baseToQuote(uint256 baseAmount, uint8 baseDecimals, uint8 quoteDecimals, uint256 priceE18)
        internal
        pure
        returns (uint256 quoteAmount)
    {
        if (priceE18 == ZERO) {
            revert InvalidPrice();
        }

        uint256 quoteScale = _scale(quoteDecimals);
        uint256 baseScale = _scale(baseDecimals);
        uint256 quoteUnits = Math.mulDiv(baseAmount, quoteScale, baseScale);

        return Math.mulDiv(quoteUnits, priceE18, PRICE_SCALE);
    }

    /// @notice Converts a quote asset amount into the base asset amount.
    /// @dev Rounds down when the conversion leaves a remainder.
    /// @param quoteAmount Amount of quote asset in its smallest unit.
    /// @param baseDecimals Decimal precision used by the base asset.
    /// @param quoteDecimals Decimal precision used by the quote asset.
    /// @param priceE18 Quote value of one whole base asset, scaled to 18 decimals.
    /// @return baseAmount Amount of base asset in its smallest unit.
    function quoteToBase(uint256 quoteAmount, uint8 baseDecimals, uint8 quoteDecimals, uint256 priceE18)
        internal
        pure
        returns (uint256 baseAmount)
    {
        if (priceE18 == ZERO) {
            revert InvalidPrice();
        }

        uint256 baseScale = _scale(baseDecimals);
        uint256 quoteScale = _scale(quoteDecimals);
        uint256 baseUnits = Math.mulDiv(quoteAmount, baseScale, quoteScale);

        return Math.mulDiv(baseUnits, PRICE_SCALE, priceE18);
    }

    /// @notice Converts an asset decimal count into a power-of-ten scale.
    /// @param decimals Decimal precision to convert.
    /// @return scale Power-of-ten scale for the decimal precision.
    function _scale(uint8 decimals) private pure returns (uint256 scale) {
        return DECIMAL_BASE ** decimals;
    }
}
