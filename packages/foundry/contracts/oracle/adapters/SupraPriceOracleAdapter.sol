// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { IPriceOracle } from "../interfaces/IPriceOracle.sol";
import { ISupraSValueFeed } from "../interfaces/ISupraSValueFeed.sol";
import { AssetConversionLib } from "../lib/AssetConversionLib.sol";
import { ProviderLib } from "../lib/ProviderLib.sol";

/// @title SupraPriceOracleAdapter
/// @notice Normalizes Supra Push Oracle S-Value feeds into the shared `IPriceOracle` interface.
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

    /// @notice Zero pair key used for pair validation.
    bytes32 internal constant ZERO_PAIR_KEY = bytes32(0);

    /// @notice Supra feed config for one pair.
    /// @param pairKey Deterministic BASE/QUOTE pair key served by the feed.
    /// @param supraPairId Supra pair ID from the Data Feeds index.
    struct PairConfig {
        bytes32 pairKey;
        uint256 supraPairId;
    }

    /// @notice Returned when the Supra push oracle address is zero.
    error SupraOracleIsZero();

    /// @notice Returned when no pair configs are provided.
    error OracleConfigIsEmpty();

    /// @notice Returned when a pair key is zero.
    error OraclePairKeyIsZero();

    /// @notice Returned when a pair is configured more than once.
    /// @param pairKey Duplicate pair key.
    error OraclePairAlreadyConfigured(bytes32 pairKey);

    /// @notice Supra Push Oracle read by this adapter.
    ISupraSValueFeed public immutable SUPRA_ORACLE;

    /// @notice Provider key for this adapter.
    bytes32 public immutable PROVIDER_KEY;

    /// @notice Maximum allowed age, in seconds, for Supra feed updates.
    uint256 public immutable MAX_STALENESS;

    mapping(bytes32 pairKey => uint256 supraPairId) private supraPairIds;
    mapping(bytes32 pairKey => bool isConfigured) private configuredPairs;

    /// @notice Initializes the adapter for one or more pair ID configs.
    /// @param supraOracle_ Supra Push Oracle address.
    /// @param pairConfigs Supra pair configs served by this adapter.
    /// @param maxStaleness_ Maximum allowed age, in seconds, for feed updates.
    constructor(address supraOracle_, PairConfig[] memory pairConfigs, uint256 maxStaleness_) {
        if (supraOracle_ == ZERO_ADDRESS) {
            revert SupraOracleIsZero();
        }

        if (pairConfigs.length == ZERO) {
            revert OracleConfigIsEmpty();
        }

        SUPRA_ORACLE = ISupraSValueFeed(supraOracle_);
        PROVIDER_KEY = ProviderLib.SUPRA;
        MAX_STALENESS = maxStaleness_;

        for (uint256 i = 0; i < pairConfigs.length; i++) {
            _setPair(pairConfigs[i].pairKey, pairConfigs[i].supraPairId);
        }
    }

    /// @notice Returns the Supra pair ID configured for a pair.
    /// @param pairKey Pair key to inspect.
    /// @return supraPairId Supra pair ID from the Data Feeds index.
    function getSupraPairId(bytes32 pairKey) external view returns (uint256 supraPairId) {
        if (!configuredPairs[pairKey]) {
            revert OracleUnsupportedPair(pairKey);
        }

        return supraPairIds[pairKey];
    }

    /// @notice Reads the latest Supra S-Value and returns the normalized shared price data.
    /// @param pairKey Pair key to read.
    /// @dev Reverts when the feed response is stale, missing a timestamp, or reports a zero price.
    /// @return data Normalized price data using `priceE18`.
    function latestPrice(bytes32 pairKey) external view returns (PriceData memory data) {
        if (!configuredPairs[pairKey]) {
            revert OracleUnsupportedPair(pairKey);
        }

        ISupraSValueFeed.PriceFeed memory priceFeed = SUPRA_ORACLE.getSvalue(supraPairIds[pairKey]);

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
            pairKey: pairKey,
            providerKey: PROVIDER_KEY,
            priceE18: _normalizeToE18(priceFeed.price, priceFeed.decimals),
            updatedAt: updatedAt
        });
    }

    /// @notice Stores one Supra pair config.
    /// @param pairKey Pair key served by the Supra pair ID.
    /// @param supraPairId Supra pair ID from the Data Feeds index.
    function _setPair(bytes32 pairKey, uint256 supraPairId) private {
        if (pairKey == ZERO_PAIR_KEY) {
            revert OraclePairKeyIsZero();
        }

        if (configuredPairs[pairKey]) {
            revert OraclePairAlreadyConfigured(pairKey);
        }

        supraPairIds[pairKey] = supraPairId;
        configuredPairs[pairKey] = true;
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
