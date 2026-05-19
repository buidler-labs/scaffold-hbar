// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { AggregatorV3Interface } from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import { IPriceOracle } from "../interfaces/IPriceOracle.sol";
import { AssetConversionLib } from "../lib/AssetConversionLib.sol";
import { ProviderLib } from "../lib/ProviderLib.sol";

/// @title ChainlinkPriceOracleAdapter
/// @notice Normalizes one Chainlink Data Feed into the shared `IPriceOracle` interface.
/// @dev Each adapter is bound to one `BASE/QUOTE` pair and one Chainlink feed.
contract ChainlinkPriceOracleAdapter is IPriceOracle {
    /// @notice Zero value used for validation comparisons.
    uint256 internal constant ZERO = 0;

    /// @notice Signed zero value used for Chainlink answer validation.
    int256 internal constant ZERO_INT = 0;

    /// @notice Decimal precision used by normalized oracle prices.
    uint8 internal constant NORMALIZED_DECIMALS = 18;

    /// @notice Zero address used for feed validation.
    address internal constant ZERO_ADDRESS = address(0);

    /// @notice Returned when the Chainlink feed address is zero.
    error ChainlinkFeedIsZero();

    /// @notice Chainlink Data Feed read by this adapter.
    AggregatorV3Interface public immutable FEED;

    /// @notice Pair key served by this adapter.
    bytes32 public immutable PAIR_KEY;

    /// @notice Provider key for this adapter.
    bytes32 public immutable PROVIDER_KEY;

    /// @notice Maximum allowed age, in seconds, for Chainlink feed updates.
    uint256 public immutable MAX_STALENESS;

    /// @notice Initializes the adapter for one pair/feed.
    /// @param pairKey_ Deterministic `BASE/QUOTE` pair key served by the adapter.
    /// @param feed_ Chainlink Data Feed address.
    /// @param maxStaleness_ Maximum allowed age, in seconds, for feed updates.
    constructor(bytes32 pairKey_, address feed_, uint256 maxStaleness_) {
        if (feed_ == ZERO_ADDRESS) {
            revert ChainlinkFeedIsZero();
        }

        FEED = AggregatorV3Interface(feed_);
        PAIR_KEY = pairKey_;
        PROVIDER_KEY = ProviderLib.CHAINLINK;
        MAX_STALENESS = maxStaleness_;
    }

    /// @notice Reads the latest Chainlink answer and returns the normalized shared price data.
    /// @dev Reverts when the feed answer is incomplete, stale, or non-positive.
    /// @return data Normalized price data using `priceE18`.
    function latestPrice() external view returns (PriceData memory data) {
        (uint80 roundId, int256 answer,, uint256 updatedAt, uint80 answeredInRound) = FEED.latestRoundData();

        if (answeredInRound < roundId || updatedAt == ZERO) {
            revert OracleIncompleteRound();
        }

        if (answer <= ZERO_INT) {
            revert OracleInvalidPrice();
        }

        if (block.timestamp - updatedAt > MAX_STALENESS) {
            revert OracleStalePrice(updatedAt, MAX_STALENESS);
        }

        uint256 positiveAnswer = uint256(answer);

        return PriceData({
            pairKey: PAIR_KEY,
            providerKey: PROVIDER_KEY,
            priceE18: _normalizeToE18(positiveAnswer, FEED.decimals()),
            updatedAt: updatedAt
        });
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
