// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title ISupraSValueFeed
/// @notice Minimal Supra Push Oracle interface used by the oracle adapter template.
/// @dev This interface follows Supra's Solidity push oracle shape for reading one S-Value pair by pair index.
interface ISupraSValueFeed {
    /// @notice Supra price feed response for one pair.
    /// @param round Supra round number for the response.
    /// @param decimals Decimal precision used by `price`.
    /// @param time Timestamp, in seconds, when Supra updated the pair.
    /// @param price Price value scaled by `decimals`.
    struct PriceFeed {
        uint256 round;
        uint256 decimals;
        uint256 time;
        uint256 price;
    }

    /// @notice Returns the latest S-Value for one Supra pair index.
    /// @param pairIndex Supra pair ID from the Data Feeds index.
    /// @return priceFeed Latest price feed response for the pair.
    function getSvalue(uint256 pairIndex) external view returns (PriceFeed memory priceFeed);

    /// @notice Returns the latest update timestamp for one Supra pair index.
    /// @param pairIndex Supra pair ID from the Data Feeds index.
    /// @return updatedAt Latest update timestamp for the pair.
    function getTimestamp(uint256 pairIndex) external view returns (uint256 updatedAt);
}
