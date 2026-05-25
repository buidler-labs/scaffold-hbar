// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { IPriceOracle } from "../interfaces/IPriceOracle.sol";
import { ISupraSValueFeed } from "../interfaces/ISupraSValueFeed.sol";
import { AssetConversionLib } from "../lib/AssetConversionLib.sol";
import { ProviderLib } from "../lib/ProviderLib.sol";

/// @title SupraPriceOracleAdapter
/// @notice Normalizes one Supra Push Oracle S-Value feed into the shared `IPriceOracle` interface.
/// @dev Each adapter is bound to one `BASE/QUOTE` pair and one Supra pair ID.
contract SupraPriceOracleAdapter is IPriceOracle {
    /// @notice Zero value used for validation comparisons.
    uint256 internal constant ZERO = 0;

    /// @notice Decimal precision used by normalized oracle prices.
    uint256 internal constant NORMALIZED_DECIMALS = 18;

    /// @notice Timestamp values above this threshold are treated as Unix milliseconds.
    uint256 internal constant UNIX_SECONDS_UPPER_BOUND = 10_000_000_000;

    /// @notice Number of milliseconds in one second.
    uint256 internal constant MILLISECONDS_PER_SECOND = 1_000;

    /// @notice Zero address used for oracle validation.
    address internal constant ZERO_ADDRESS = address(0);

    /// @notice Returned when the Supra push oracle address is zero.
    error SupraOracleIsZero();

    /// @notice Supra Push Oracle read by this adapter.
    ISupraSValueFeed public immutable SUPRA_ORACLE;

    /// @notice Pair key served by this adapter.
    bytes32 public immutable PAIR_KEY;

    /// @notice Provider key for this adapter.
    bytes32 public immutable PROVIDER_KEY;

    /// @notice Supra pair ID served by this adapter.
    uint256 public immutable SUPRA_PAIR_ID;

    /// @notice Maximum allowed age, in seconds, for Supra feed updates.
    uint256 public immutable MAX_STALENESS;

    /// @notice Initializes the adapter for one pair and Supra pair ID.
    /// @param pairKey_ Deterministic `BASE/QUOTE` pair key served by the adapter.
    /// @param supraOracle_ Supra Push Oracle address.
    /// @param supraPairId_ Supra pair ID from the Data Feeds index.
    /// @param maxStaleness_ Maximum allowed age, in seconds, for feed updates.
    constructor(bytes32 pairKey_, address supraOracle_, uint256 supraPairId_, uint256 maxStaleness_) {
        if (supraOracle_ == ZERO_ADDRESS) {
            revert SupraOracleIsZero();
        }

        SUPRA_ORACLE = ISupraSValueFeed(supraOracle_);
        PAIR_KEY = pairKey_;
        PROVIDER_KEY = ProviderLib.SUPRA;
        SUPRA_PAIR_ID = supraPairId_;
        MAX_STALENESS = maxStaleness_;
    }

    /// @notice Reads the latest Supra S-Value and returns the normalized shared price data.
    /// @dev Reverts when the feed response is stale, missing a timestamp, or reports a zero price.
    /// @return data Normalized price data using `priceE18`.
    function latestPrice() external view returns (PriceData memory data) {
        ISupraSValueFeed.PriceFeed memory priceFeed = SUPRA_ORACLE.getSvalue(SUPRA_PAIR_ID);

        if (priceFeed.time == ZERO) {
            revert OracleIncompleteRound();
        }

        if (priceFeed.price == ZERO) {
            revert OracleInvalidPrice();
        }

        uint256 updatedAt = _toUnixSeconds(priceFeed.time);

        if (block.timestamp - updatedAt > MAX_STALENESS) {
            revert OracleStalePrice(updatedAt, MAX_STALENESS);
        }

        return PriceData({
            pairKey: PAIR_KEY,
            providerKey: PROVIDER_KEY,
            priceE18: _normalizeToE18(priceFeed.price, priceFeed.decimals),
            updatedAt: updatedAt
        });
    }

    /// @notice Normalizes a Supra price to 18 decimals.
    /// @param price Positive Supra price.
    /// @param decimals Decimal precision reported by Supra.
    /// @return priceE18 Supra price scaled to 18 decimals.
    function _normalizeToE18(uint256 price, uint256 decimals) private pure returns (uint256 priceE18) {
        if (decimals == NORMALIZED_DECIMALS) {
            return price;
        }

        if (decimals < NORMALIZED_DECIMALS) {
            return price * (AssetConversionLib.DECIMAL_BASE ** (NORMALIZED_DECIMALS - decimals));
        }

        return price / (AssetConversionLib.DECIMAL_BASE ** (decimals - NORMALIZED_DECIMALS));
    }

    /// @notice Converts Supra timestamps to Unix seconds.
    /// @dev Supra Hedera push feeds report millisecond timestamps; this helper also accepts seconds.
    /// @param timestamp Timestamp reported by Supra.
    /// @return unixSeconds Timestamp normalized to seconds.
    function _toUnixSeconds(uint256 timestamp) private pure returns (uint256 unixSeconds) {
        if (timestamp > UNIX_SECONDS_UPPER_BOUND) {
            return timestamp / MILLISECONDS_PER_SECOND;
        }

        return timestamp;
    }
}
