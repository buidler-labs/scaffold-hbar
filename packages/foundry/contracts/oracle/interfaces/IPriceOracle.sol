// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title IPriceOracle
/// @notice Normalized read interface implemented by every price oracle adapter.
/// @dev Implementations must return prices scaled to 18 decimals so consumers can use one conversion path across
///      Chainlink, Supra, Pyth, or mocks.
interface IPriceOracle {
    /// @notice Returned when an oracle reports a zero, negative, or otherwise unusable price.
    error OracleInvalidPrice();

    /// @notice Returned when an oracle price is older than the adapter's configured freshness window.
    /// @param updatedAt Timestamp reported by the upstream oracle for the latest accepted price.
    /// @param maxStaleness Maximum allowed age, in seconds, configured by the adapter.
    error OracleStalePrice(uint256 updatedAt, uint256 maxStaleness);

    /// @notice Returned when an upstream oracle response is not finalized or cannot be trusted.
    error OracleIncompleteRound();

    /// @notice Returned when this oracle does not support the requested pair.
    /// @param pairKey Pair key requested by the caller.
    error OracleUnsupportedPair(bytes32 pairKey);

    /// @notice Normalized price response for one provider-backed BASE/QUOTE pair.
    /// @param pairKey Deterministic key for the BASE/QUOTE pair this adapter serves.
    /// @param providerKey Deterministic key for the provider backing this adapter.
    /// @param priceE18 Price of one base asset unit denominated in quote asset units, scaled to 18 decimals.
    /// @param updatedAt Timestamp, in seconds, when the upstream oracle last updated the reported price.
    struct PriceData {
        bytes32 pairKey;
        bytes32 providerKey;
        uint256 priceE18;
        uint256 updatedAt;
    }

    /// @notice Reads the latest validated and normalized price for a requested pair.
    /// @param pairKey Deterministic BASE/QUOTE pair key to read.
    /// @dev Must revert instead of returning invalid, incomplete, stale, or non-positive price data.
    /// @return data Normalized price data using the shared `PriceData` shape.
    function latestPrice(bytes32 pairKey) external view returns (PriceData memory data);
}
