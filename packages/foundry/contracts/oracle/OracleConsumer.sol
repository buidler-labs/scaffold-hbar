// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IPriceOracle } from "./interfaces/IPriceOracle.sol";
import { AssetConversionLib } from "./lib/AssetConversionLib.sol";

/// @title OracleConsumer
/// @notice Example consumer that converts asset amounts through one selected oracle adapter.
/// @dev This first demo slice is read-only. Native HBAR payment behavior will be added separately.
contract OracleConsumer is Ownable {
    /// @notice Zero address used for oracle validation.
    address internal constant ZERO_ADDRESS = address(0);

    /// @notice Returned when the oracle address is zero.
    error OracleIsZero();

    /// @notice Emitted when the selected oracle adapter changes.
    /// @param previousOracle Previously configured oracle adapter.
    /// @param newOracle Newly configured oracle adapter.
    event OracleUpdated(address indexed previousOracle, address indexed newOracle);

    /// @notice Oracle adapter used for all conversion reads.
    IPriceOracle public oracle;

    /// @notice Sets the initial oracle adapter used by this consumer.
    /// @param oracle_ Oracle adapter address used for all conversion reads.
    /// @param initialOwner Account allowed to update the selected oracle.
    constructor(address oracle_, address initialOwner) Ownable(initialOwner) {
        _setOracle(oracle_);
    }

    /// @notice Updates the selected oracle adapter.
    /// @param newOracle Oracle adapter address used for future conversion reads.
    function setOracle(address newOracle) external onlyOwner {
        _setOracle(newOracle);
    }

    /// @notice Converts a base asset amount into a quote asset amount using a registered oracle price.
    /// @param pairKey Deterministic `BASE/QUOTE` pair key to read.
    /// @param baseAmount Amount of base asset in its smallest unit.
    /// @param baseDecimals Decimal precision used by the base asset.
    /// @param quoteDecimals Decimal precision used by the quote asset.
    /// @return quoteAmount Amount of quote asset in its smallest unit.
    function baseToQuote(bytes32 pairKey, uint256 baseAmount, uint8 baseDecimals, uint8 quoteDecimals)
        external
        view
        returns (uint256 quoteAmount)
    {
        IPriceOracle.PriceData memory data = oracle.latestPrice(pairKey);

        return AssetConversionLib.baseToQuote(baseAmount, baseDecimals, quoteDecimals, data.priceE18);
    }

    /// @notice Converts a quote asset amount into a base asset amount using a registered oracle price.
    /// @param pairKey Deterministic `BASE/QUOTE` pair key to read.
    /// @param quoteAmount Amount of quote asset in its smallest unit.
    /// @param baseDecimals Decimal precision used by the base asset.
    /// @param quoteDecimals Decimal precision used by the quote asset.
    /// @return baseAmount Amount of base asset in its smallest unit.
    function quoteToBase(bytes32 pairKey, uint256 quoteAmount, uint8 baseDecimals, uint8 quoteDecimals)
        external
        view
        returns (uint256 baseAmount)
    {
        IPriceOracle.PriceData memory data = oracle.latestPrice(pairKey);

        return AssetConversionLib.quoteToBase(quoteAmount, baseDecimals, quoteDecimals, data.priceE18);
    }

    /// @notice Stores a new selected oracle adapter.
    /// @param newOracle Oracle adapter address to store.
    function _setOracle(address newOracle) private {
        if (newOracle == ZERO_ADDRESS) {
            revert OracleIsZero();
        }

        address previousOracle = address(oracle);
        oracle = IPriceOracle(newOracle);

        emit OracleUpdated(previousOracle, newOracle);
    }
}
