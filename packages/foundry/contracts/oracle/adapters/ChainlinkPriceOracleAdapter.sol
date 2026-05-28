// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { AggregatorV3Interface } from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import { IPriceOracle } from "../interfaces/IPriceOracle.sol";
import { AssetConversionLib } from "../lib/AssetConversionLib.sol";
import { ProviderLib } from "../lib/ProviderLib.sol";

/// @title ChainlinkPriceOracleAdapter
/// @notice Normalizes Chainlink Data Feeds into the shared `IPriceOracle` interface.
contract ChainlinkPriceOracleAdapter is IPriceOracle {
    /// @notice Zero value used for validation comparisons.
    uint256 internal constant ZERO = 0;

    /// @notice Signed zero value used for Chainlink answer validation.
    int256 internal constant ZERO_INT = 0;

    /// @notice Decimal precision used by normalized oracle prices.
    uint8 internal constant NORMALIZED_DECIMALS = 18;

    /// @notice Zero address used for feed validation.
    address internal constant ZERO_ADDRESS = address(0);

    /// @notice Zero pair key used for pair validation.
    bytes32 internal constant ZERO_PAIR_KEY = bytes32(0);

    /// @notice Chainlink feed config for one pair.
    /// @param pairKey Deterministic BASE/QUOTE pair key served by the feed.
    /// @param feed Chainlink Data Feed address.
    struct FeedConfig {
        bytes32 pairKey;
        address feed;
    }

    /// @notice Returned when the Chainlink feed address is zero.
    error ChainlinkFeedIsZero();

    /// @notice Returned when no pair configs are provided.
    error OracleConfigIsEmpty();

    /// @notice Returned when a pair key is zero.
    error OraclePairKeyIsZero();

    /// @notice Returned when a pair is configured more than once.
    /// @param pairKey Duplicate pair key.
    error OraclePairAlreadyConfigured(bytes32 pairKey);

    /// @notice Provider key for this adapter.
    bytes32 public immutable PROVIDER_KEY;

    /// @notice Maximum allowed age, in seconds, for Chainlink feed updates.
    uint256 public immutable MAX_STALENESS;

    mapping(bytes32 pairKey => AggregatorV3Interface feed) private feeds;

    /// @notice Initializes the adapter for one or more pair/feed configs.
    /// @param feedConfigs Chainlink feed configs served by this adapter.
    /// @param maxStaleness_ Maximum allowed age, in seconds, for feed updates.
    constructor(FeedConfig[] memory feedConfigs, uint256 maxStaleness_) {
        if (feedConfigs.length == ZERO) {
            revert OracleConfigIsEmpty();
        }

        PROVIDER_KEY = ProviderLib.CHAINLINK;
        MAX_STALENESS = maxStaleness_;

        for (uint256 i = 0; i < feedConfigs.length; i++) {
            _setFeed(feedConfigs[i].pairKey, feedConfigs[i].feed);
        }
    }

    /// @notice Returns the Chainlink feed configured for a pair.
    /// @param pairKey Pair key to inspect.
    /// @return feed Chainlink Data Feed address.
    function getFeed(bytes32 pairKey) external view returns (address feed) {
        return address(feeds[pairKey]);
    }

    /// @notice Reads the latest Chainlink answer and returns the normalized shared price data.
    /// @param pairKey Pair key to read.
    /// @dev Reverts when the feed answer is incomplete, stale, or non-positive.
    /// @return data Normalized price data using `priceE18`.
    function latestPrice(bytes32 pairKey) external view returns (PriceData memory data) {
        AggregatorV3Interface feed = feeds[pairKey];

        if (address(feed) == ZERO_ADDRESS) {
            revert OracleUnsupportedPair(pairKey);
        }

        (uint80 roundId, int256 answer,, uint256 updatedAt, uint80 answeredInRound) = feed.latestRoundData();

        if (answeredInRound < roundId || updatedAt == ZERO) {
            revert OracleIncompleteRound();
        }

        if (answer <= ZERO_INT) {
            revert OracleInvalidPrice();
        }

        if (block.timestamp - updatedAt > MAX_STALENESS) {
            revert OracleStalePrice(updatedAt, MAX_STALENESS);
        }

        // casting to `uint256` is safe because non-positive Chainlink answers are rejected above.
        // forge-lint: disable-next-line(unsafe-typecast)
        uint256 positiveAnswer = uint256(answer);

        return PriceData({
            pairKey: pairKey,
            providerKey: PROVIDER_KEY,
            priceE18: _normalizeToE18(positiveAnswer, feed.decimals()),
            updatedAt: updatedAt
        });
    }

    /// @notice Stores one Chainlink feed config.
    /// @param pairKey Pair key served by the feed.
    /// @param feed Chainlink Data Feed address.
    function _setFeed(bytes32 pairKey, address feed) private {
        if (pairKey == ZERO_PAIR_KEY) {
            revert OraclePairKeyIsZero();
        }

        if (feed == ZERO_ADDRESS) {
            revert ChainlinkFeedIsZero();
        }

        if (address(feeds[pairKey]) != ZERO_ADDRESS) {
            revert OraclePairAlreadyConfigured(pairKey);
        }

        feeds[pairKey] = AggregatorV3Interface(feed);
    }

    /// @notice Normalizes a Chainlink feed answer to 18 decimals.
    /// @param answer Positive Chainlink feed answer.
    /// @param decimals Decimal precision reported by the Chainlink feed.
    /// @return priceE18 Feed answer scaled to 18 decimals.
    function _normalizeToE18(uint256 answer, uint8 decimals) private pure returns (uint256 priceE18) {
        if (decimals == NORMALIZED_DECIMALS) {
            return answer;
        }

        if (decimals < NORMALIZED_DECIMALS) {
            return answer * (AssetConversionLib.DECIMAL_BASE ** (NORMALIZED_DECIMALS - decimals));
        }

        return answer / (AssetConversionLib.DECIMAL_BASE ** (decimals - NORMALIZED_DECIMALS));
    }
}
