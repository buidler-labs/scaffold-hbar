// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Script } from "forge-std/Script.sol";
import { console2 } from "forge-std/console2.sol";
import { IPriceOracle } from "../contracts/oracle/interfaces/IPriceOracle.sol";
import { OracleConsumer } from "../contracts/oracle/OracleConsumer.sol";
import { SupraPriceOracleAdapter } from "../contracts/oracle/adapters/SupraPriceOracleAdapter.sol";
import { PairLib } from "../contracts/oracle/lib/PairLib.sol";

/// @title ReadSupraOracle
/// @notice Reads deployed Supra oracle template contracts and logs adapter prices plus demo conversions.
/// @dev This script is read-only and intentionally does not start a broadcast.
contract ReadSupraOracle is Script {
    /// @notice Decimal base used for display scaling.
    uint256 internal constant DECIMAL_BASE = 10;

    /// @notice Number of tinybars in one whole HBAR.
    uint256 internal constant ONE_HBAR = 100_000_000;

    /// @notice Number of satoshis in one whole BTC.
    uint256 internal constant ONE_BTC = 100_000_000;

    /// @notice Number of wei in one whole ETH.
    uint256 internal constant ONE_ETH = 1 ether;

    /// @notice Number of USDT-style base units in one whole quote amount.
    uint256 internal constant ONE_USDT = 1_000_000;

    /// @notice HBAR decimal precision on Hedera.
    uint8 internal constant HBAR_DECIMALS = 8;

    /// @notice BTC feed base decimal precision used by this demo conversion.
    uint8 internal constant BTC_DECIMALS = 8;

    /// @notice ETH decimal precision.
    uint8 internal constant ETH_DECIMALS = 18;

    /// @notice USDT quote precision used by this demo conversion.
    uint8 internal constant USDT_DECIMALS = 6;

    /// @notice Number of decimals to display for HBAR/USDT prices.
    uint8 internal constant HBAR_DISPLAY_DECIMALS = 5;

    /// @notice Number of decimals to display for BTC/USDT and ETH/USDT prices.
    uint8 internal constant MAJOR_DISPLAY_DECIMALS = 2;

    /// @notice Reads deployment addresses from `deployments/<chainId>.json` and logs oracle values.
    function run() external view {
        string memory deploymentsJson = _readDeployments();
        SupraPriceOracleAdapter adapter =
            SupraPriceOracleAdapter(_deploymentAddress(deploymentsJson, "SupraPriceOracleAdapter"));
        OracleConsumer consumer = OracleConsumer(_deploymentAddress(deploymentsJson, "OracleConsumer"));

        console2.log("Chain ID:", block.chainid);
        console2.log("SupraPriceOracleAdapter:", address(adapter));
        console2.log("OracleConsumer:", address(consumer));

        _requireConsumerOracle(consumer, address(adapter));

        _logPair(adapter, consumer, "HBAR", "USDT", ONE_HBAR, HBAR_DECIMALS, HBAR_DISPLAY_DECIMALS);
        _logPair(adapter, consumer, "BTC", "USDT", ONE_BTC, BTC_DECIMALS, MAJOR_DISPLAY_DECIMALS);
        _logPair(adapter, consumer, "ETH", "USDT", ONE_ETH, ETH_DECIMALS, MAJOR_DISPLAY_DECIMALS);
    }

    /// @notice Reads the deployment export for the current chain.
    /// @return deploymentsJson JSON content from `deployments/<chainId>.json`.
    function _readDeployments() private view returns (string memory deploymentsJson) {
        string memory root = vm.projectRoot();
        string memory path = string.concat(root, "/deployments/", vm.toString(block.chainid), ".json");
        return vm.readFile(path);
    }

    /// @notice Looks up a deployment address by exported deployment name.
    /// @param deploymentsJson Deployment JSON content.
    /// @param deploymentName Name stored in the deployment export.
    /// @return deployment Deployed contract address.
    function _deploymentAddress(string memory deploymentsJson, string memory deploymentName)
        private
        pure
        returns (address deployment)
    {
        string[] memory keys = vm.parseJsonKeys(deploymentsJson, ".");

        for (uint256 i = 0; i < keys.length; i++) {
            if (_isSameString(keys[i], "networkName")) {
                continue;
            }

            string memory valuePath = string.concat(".", keys[i]);
            string memory value = vm.parseJsonString(deploymentsJson, valuePath);
            if (_isSameString(value, deploymentName)) {
                return vm.parseAddress(keys[i]);
            }
        }

        revert(string.concat("Deployment not found: ", deploymentName));
    }

    /// @notice Verifies that the consumer is configured to use the adapter read by this script.
    /// @param consumer Deployed oracle consumer demo.
    /// @param adapter Adapter expected to be selected by the consumer.
    function _requireConsumerOracle(OracleConsumer consumer, address adapter) private view {
        if (address(consumer.oracle()) != adapter) {
            revert("OracleConsumer is not using SupraPriceOracleAdapter");
        }
    }

    /// @notice Logs adapter price data and example conversions for one Supra pair.
    /// @param adapter Deployed Supra adapter.
    /// @param consumer Deployed oracle consumer demo.
    /// @param baseSymbol Canonical base symbol.
    /// @param quoteSymbol Canonical quote symbol.
    /// @param oneBaseAmount One whole base asset amount in smallest units.
    /// @param baseDecimals Base asset decimals.
    /// @param quoteDisplayDecimals Number of decimal places to display for quote amounts.
    function _logPair(
        SupraPriceOracleAdapter adapter,
        OracleConsumer consumer,
        string memory baseSymbol,
        string memory quoteSymbol,
        uint256 oneBaseAmount,
        uint8 baseDecimals,
        uint8 quoteDisplayDecimals
    ) private view {
        bytes32 pairKey = PairLib.pairKey(baseSymbol, quoteSymbol);
        IPriceOracle.PriceData memory data = adapter.latestPrice(pairKey);
        uint256 quoteAmount = consumer.baseToQuote(pairKey, oneBaseAmount, baseDecimals, USDT_DECIMALS);
        uint256 baseAmount = consumer.quoteToBase(pairKey, ONE_USDT, baseDecimals, USDT_DECIMALS);

        console2.log("");
        console2.log(string.concat(baseSymbol, "/", quoteSymbol));
        console2.log("  adapter:", address(adapter));
        console2.log(string.concat("  price: ", _formatQuotePrice(data.priceE18, quoteDisplayDecimals)));
        console2.log("  updatedAt:", data.updatedAt);
        console2.log(string.concat("  1 ", baseSymbol, " -> ", _formatQuoteAmount(quoteAmount, quoteDisplayDecimals)));
        console2.log(string.concat("  1 USDT -> ", _formatAssetAmount(baseAmount, baseDecimals), " ", baseSymbol));
        console2.log("  raw priceE18:", data.priceE18);
    }

    /// @notice Compares two strings by hash.
    /// @param left First string.
    /// @param right Second string.
    /// @return isSame True when both strings have identical bytes.
    function _isSameString(string memory left, string memory right) private pure returns (bool isSame) {
        return keccak256(bytes(left)) == keccak256(bytes(right));
    }

    /// @notice Formats a normalized 18-decimal quote price for console output.
    /// @param priceE18 Price scaled to 18 decimals.
    /// @param displayDecimals Number of decimal places to show.
    /// @return formattedPrice Human-readable quote price.
    function _formatQuotePrice(uint256 priceE18, uint8 displayDecimals)
        private
        pure
        returns (string memory formattedPrice)
    {
        return string.concat("$", _formatRoundedDecimal(priceE18, 18, displayDecimals));
    }

    /// @notice Formats a USDT quote amount from the demo conversion output.
    /// @param quoteAmount USDT amount in `USDT_DECIMALS` base units.
    /// @param displayDecimals Number of decimal places to show.
    /// @return formattedAmount Human-readable quote amount.
    function _formatQuoteAmount(uint256 quoteAmount, uint8 displayDecimals)
        private
        pure
        returns (string memory formattedAmount)
    {
        return string.concat("$", _formatRoundedDecimal(quoteAmount, USDT_DECIMALS, displayDecimals));
    }

    /// @notice Formats an asset amount using the asset's own decimals and trims trailing zeroes.
    /// @param amount Amount in the asset's smallest units.
    /// @param decimals Asset decimal precision.
    /// @return formattedAmount Human-readable asset amount.
    function _formatAssetAmount(uint256 amount, uint8 decimals) private pure returns (string memory formattedAmount) {
        uint256 scale = _scale(decimals);
        string memory whole = _formatWholeWithCommas(vm.toString(amount / scale));

        uint256 fractionalAmount = amount % scale;
        if (fractionalAmount == 0) {
            return whole;
        }

        string memory fraction = _trimTrailingZeroes(_padLeft(vm.toString(fractionalAmount), decimals));
        return string.concat(whole, ".", fraction);
    }

    /// @notice Formats a decimal amount after rounding it to the requested display precision.
    /// @param amount Amount in smallest units.
    /// @param inputDecimals Decimal precision of `amount`.
    /// @param outputDecimals Decimal precision to show in the formatted output.
    /// @return formattedAmount Human-readable rounded decimal amount.
    function _formatRoundedDecimal(uint256 amount, uint8 inputDecimals, uint8 outputDecimals)
        private
        pure
        returns (string memory formattedAmount)
    {
        uint256 scaledAmount;

        if (inputDecimals >= outputDecimals) {
            uint256 divisor = _scale(inputDecimals - outputDecimals);
            scaledAmount = (amount + (divisor / 2)) / divisor;
        } else {
            scaledAmount = amount * _scale(outputDecimals - inputDecimals);
        }

        uint256 displayScale = _scale(outputDecimals);
        string memory whole = _formatWholeWithCommas(vm.toString(scaledAmount / displayScale));

        if (outputDecimals == 0) {
            return whole;
        }

        string memory fraction = _padLeft(vm.toString(scaledAmount % displayScale), outputDecimals);
        return string.concat(whole, ".", fraction);
    }

    /// @notice Adds thousands separators to a whole-number string.
    /// @param value Whole-number string without separators.
    /// @return formattedValue Whole-number string with comma separators.
    function _formatWholeWithCommas(string memory value) private pure returns (string memory formattedValue) {
        bytes memory digits = bytes(value);
        if (digits.length <= 3) {
            return value;
        }

        uint256 commaCount = (digits.length - 1) / 3;
        bytes memory formatted = new bytes(digits.length + commaCount);
        uint256 digitIndex = digits.length;
        uint256 formattedIndex = formatted.length;
        uint256 groupSize;

        while (digitIndex > 0) {
            formattedIndex--;
            digitIndex--;
            formatted[formattedIndex] = digits[digitIndex];
            groupSize++;

            if (groupSize == 3 && digitIndex > 0) {
                formattedIndex--;
                formatted[formattedIndex] = bytes1(0x2c);
                groupSize = 0;
            }
        }

        return string(formatted);
    }

    /// @notice Left-pads a numeric string with zeroes until it reaches the requested width.
    /// @param value Numeric string to pad.
    /// @param width Target character width.
    /// @return paddedValue Zero-padded numeric string.
    function _padLeft(string memory value, uint8 width) private pure returns (string memory paddedValue) {
        bytes memory rawValue = bytes(value);
        if (rawValue.length >= width) {
            return value;
        }

        bytes memory padded = new bytes(width);
        uint256 offset = width - rawValue.length;

        for (uint256 i = 0; i < offset; i++) {
            padded[i] = bytes1(0x30);
        }

        for (uint256 i = 0; i < rawValue.length; i++) {
            padded[offset + i] = rawValue[i];
        }

        return string(padded);
    }

    /// @notice Removes trailing zeroes from a fractional numeric string.
    /// @param value Fractional numeric string.
    /// @return trimmedValue Fractional numeric string without right-side zero padding.
    function _trimTrailingZeroes(string memory value) private pure returns (string memory trimmedValue) {
        bytes memory rawValue = bytes(value);
        uint256 end = rawValue.length;

        while (end > 0 && rawValue[end - 1] == bytes1(0x30)) {
            end--;
        }

        bytes memory trimmed = new bytes(end);
        for (uint256 i = 0; i < end; i++) {
            trimmed[i] = rawValue[i];
        }

        return string(trimmed);
    }

    /// @notice Calculates `10 ** decimals`.
    /// @param decimals Decimal precision.
    /// @return scale Decimal scale.
    function _scale(uint8 decimals) private pure returns (uint256 scale) {
        return DECIMAL_BASE ** decimals;
    }
}
