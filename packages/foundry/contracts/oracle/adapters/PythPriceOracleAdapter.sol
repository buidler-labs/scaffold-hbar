// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { IPriceOracle } from "../interfaces/IPriceOracle.sol";
import { AssetConversionLib } from "../lib/AssetConversionLib.sol";
import { ProviderLib } from "../lib/ProviderLib.sol";
import { IPyth } from "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import { PythStructs } from "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

/// @title PythPriceOracleAdapter
/// @notice Normalizes one Pyth pull-oracle price feed into the shared `IPriceOracle` interface.
/// @dev Each adapter is bound to one `BASE/QUOTE` pair and one Pyth price ID.
contract PythPriceOracleAdapter is IPriceOracle {
    /// @notice Zero value used for validation comparisons.
    uint256 internal constant ZERO = 0;

    /// @notice Signed zero value used for Pyth price validation.
    int64 internal constant ZERO_INT = 0;

    /// @notice Signed zero value used for Pyth exponent validation.
    int32 internal constant ZERO_EXPONENT = 0;

    /// @notice Decimal precision used by normalized oracle prices.
    uint256 internal constant NORMALIZED_DECIMALS = 18;

    /// @notice Zero address used for oracle validation.
    address internal constant ZERO_ADDRESS = address(0);

    /// @notice Returned when the Pyth contract address is zero.
    error PythOracleIsZero();

    /// @notice Returned when the update caller sends less native token than Pyth requires.
    /// @param provided Native token amount sent by the caller.
    /// @param required Native token amount required by Pyth for the submitted update payload.
    error PythUpdateFeeTooLow(uint256 provided, uint256 required);

    /// @notice Returned when Pyth reports an unusable confidence interval.
    error PythInvalidConfidence();

    /// @notice Pyth contract read and updated by this adapter.
    IPyth public immutable PYTH;

    /// @notice Pair key served by this adapter.
    bytes32 public immutable PAIR_KEY;

    /// @notice Provider key for this adapter.
    bytes32 public immutable PROVIDER_KEY;

    /// @notice Pyth price feed ID served by this adapter.
    bytes32 public immutable PRICE_ID;

    /// @notice Maximum allowed age, in seconds, for Pyth prices.
    uint256 public immutable MAX_STALENESS;

    /// @notice Initializes the adapter for one pair and Pyth price ID.
    /// @param pairKey_ Deterministic `BASE/QUOTE` pair key served by the adapter.
    /// @param pyth_ Pyth EVM contract address.
    /// @param priceId_ Pyth price feed ID for the configured pair.
    /// @param maxStaleness_ Maximum allowed age, in seconds, for price reads.
    constructor(bytes32 pairKey_, address pyth_, bytes32 priceId_, uint256 maxStaleness_) {
        if (pyth_ == ZERO_ADDRESS) {
            revert PythOracleIsZero();
        }

        PYTH = IPyth(pyth_);
        PAIR_KEY = pairKey_;
        PROVIDER_KEY = ProviderLib.PYTH;
        PRICE_ID = priceId_;
        MAX_STALENESS = maxStaleness_;
    }

    /// @notice Pays Pyth to update price feeds from off-chain update payloads.
    /// @dev Call this before `latestPrice()` when the on-chain Pyth price is stale.
    /// @param updateData Pyth price update payloads fetched from Hermes or another Pyth price service.
    function updatePrice(bytes[] calldata updateData) external payable {
        uint256 updateFee = PYTH.getUpdateFee(updateData);

        if (msg.value < updateFee) {
            revert PythUpdateFeeTooLow(msg.value, updateFee);
        }

        PYTH.updatePriceFeeds{ value: msg.value }(updateData);
    }

    /// @notice Reads the latest Pyth price and returns the normalized shared price data.
    /// @dev Reverts when Pyth reports a stale, non-positive, or high-uncertainty price.
    /// @return data Normalized price data using `priceE18`.
    function latestPrice() external view returns (PriceData memory data) {
        PythStructs.Price memory price = PYTH.getPriceNoOlderThan(PRICE_ID, MAX_STALENESS);

        if (price.publishTime == ZERO) {
            revert OracleIncompleteRound();
        }

        if (price.price <= ZERO_INT) {
            revert OracleInvalidPrice();
        }

        if (price.conf == ZERO || price.conf > uint64(price.price)) {
            revert PythInvalidConfidence();
        }

        return PriceData({
            pairKey: PAIR_KEY,
            providerKey: PROVIDER_KEY,
            priceE18: _normalizeToE18(price.price, price.expo),
            updatedAt: price.publishTime
        });
    }

    /// @notice Normalizes a Pyth signed price and exponent to 18 decimals.
    /// @param price Positive Pyth price.
    /// @param expo Base-10 exponent applied to the Pyth price.
    /// @return priceE18 Pyth price scaled to 18 decimals.
    function _normalizeToE18(int64 price, int32 expo) private pure returns (uint256 priceE18) {
        // casting to `uint64` is safe because `latestPrice` rejects non-positive Pyth prices before normalization.
        // forge-lint: disable-next-line(unsafe-typecast)
        uint256 positivePrice = uint64(price);

        if (expo >= ZERO_EXPONENT) {
            // casting to `uint32` is safe because this branch only handles non-negative exponents.
            // forge-lint: disable-next-line(unsafe-typecast)
            return positivePrice * (AssetConversionLib.DECIMAL_BASE ** (NORMALIZED_DECIMALS + uint32(expo)));
        }

        // casting to `uint256` is safe because this branch only handles negative exponents.
        // forge-lint: disable-next-line(unsafe-typecast)
        uint256 exponentMagnitude = uint256(-int256(expo));

        if (exponentMagnitude <= NORMALIZED_DECIMALS) {
            return positivePrice * (AssetConversionLib.DECIMAL_BASE ** (NORMALIZED_DECIMALS - exponentMagnitude));
        }

        return positivePrice / (AssetConversionLib.DECIMAL_BASE ** (exponentMagnitude - NORMALIZED_DECIMALS));
    }
}
