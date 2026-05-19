// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { IPriceOracle } from "./interfaces/IPriceOracle.sol";
import { AssetConversionLib } from "./lib/AssetConversionLib.sol";
import { OracleRegistry } from "./OracleRegistry.sol";

/// @title OracleConsumer
/// @notice Example consumer that converts asset amounts through `OracleRegistry` prices.
/// @dev This first demo slice is read-only. Native HBAR payment behavior will be added separately.
contract OracleConsumer {
    /// @notice Zero address used for registry validation.
    address internal constant ZERO_ADDRESS = address(0);

    /// @notice Returned when the registry address is zero.
    error OracleRegistryIsZero();

    /// @notice Registry used to resolve pair/provider oracle adapters.
    OracleRegistry public immutable REGISTRY;

    /// @notice Sets the oracle registry used by this consumer.
    /// @param registry_ Registry address used for all conversion reads.
    constructor(address registry_) {
        if (registry_ == ZERO_ADDRESS) {
            revert OracleRegistryIsZero();
        }

        REGISTRY = OracleRegistry(registry_);
    }

    /// @notice Converts a base asset amount into a quote asset amount using a registered oracle price.
    /// @param pairKey Deterministic `BASE/QUOTE` pair key to read.
    /// @param providerKey Deterministic provider key to read.
    /// @param baseAmount Amount of base asset in its smallest unit.
    /// @param baseDecimals Decimal precision used by the base asset.
    /// @param quoteDecimals Decimal precision used by the quote asset.
    /// @return quoteAmount Amount of quote asset in its smallest unit.
    function baseToQuote(
        bytes32 pairKey,
        bytes32 providerKey,
        uint256 baseAmount,
        uint8 baseDecimals,
        uint8 quoteDecimals
    ) external view returns (uint256 quoteAmount) {
        IPriceOracle.PriceData memory data = REGISTRY.latestPrice(pairKey, providerKey);

        return AssetConversionLib.baseToQuote(baseAmount, baseDecimals, quoteDecimals, data.priceE18);
    }

    /// @notice Converts a quote asset amount into a base asset amount using a registered oracle price.
    /// @param pairKey Deterministic `BASE/QUOTE` pair key to read.
    /// @param providerKey Deterministic provider key to read.
    /// @param quoteAmount Amount of quote asset in its smallest unit.
    /// @param baseDecimals Decimal precision used by the base asset.
    /// @param quoteDecimals Decimal precision used by the quote asset.
    /// @return baseAmount Amount of base asset in its smallest unit.
    function quoteToBase(
        bytes32 pairKey,
        bytes32 providerKey,
        uint256 quoteAmount,
        uint8 baseDecimals,
        uint8 quoteDecimals
    ) external view returns (uint256 baseAmount) {
        IPriceOracle.PriceData memory data = REGISTRY.latestPrice(pairKey, providerKey);

        return AssetConversionLib.quoteToBase(quoteAmount, baseDecimals, quoteDecimals, data.priceE18);
    }
}
