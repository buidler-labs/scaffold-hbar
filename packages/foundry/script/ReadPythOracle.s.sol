// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { PythPriceOracleAdapter } from "../contracts/oracle/adapters/PythPriceOracleAdapter.sol";
import { IPriceOracle } from "../contracts/oracle/interfaces/IPriceOracle.sol";
import { OracleConsumer } from "../contracts/oracle/OracleConsumer.sol";
import { OracleRegistry } from "../contracts/oracle/OracleRegistry.sol";
import { PairLib } from "../contracts/oracle/lib/PairLib.sol";
import { ProviderLib } from "../contracts/oracle/lib/ProviderLib.sol";
import { HelperConfig } from "./HelperConfig.s.sol";
import { IPyth } from "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import { Script } from "forge-std/Script.sol";
import { console2 } from "forge-std/console2.sol";

/// @title ReadPythOracle
/// @notice Updates deployed Pyth pull-oracle adapters and logs registry prices plus demo conversions.
/// @dev Unlike Chainlink and Supra reads, this script broadcasts Pyth update transactions before reading prices.
contract ReadPythOracle is Script {
    /// @notice Decimal base used for display scaling.
    uint256 internal constant DECIMAL_BASE = 10;

    /// @notice Number of tinybars in one whole HBAR.
    uint256 internal constant ONE_HBAR = 100_000_000;

    /// @notice Number of satoshis in one whole BTC.
    uint256 internal constant ONE_BTC = 100_000_000;

    /// @notice Number of wei in one whole ETH.
    uint256 internal constant ONE_ETH = 1 ether;

    /// @notice Number of USDC-style base units in one whole USD quote amount.
    uint256 internal constant ONE_USD = 1_000_000;

    /// @notice Command length used to fetch one Pyth update payload through `ffi`.
    uint256 internal constant FETCH_PYTH_UPDATE_DATA_COMMAND_LENGTH = 3;

    /// @notice Minimum non-zero native value accepted by Hedera JSON-RPC, equal to one tinybar.
    uint256 internal constant HEDERA_MIN_NON_ZERO_VALUE = 10_000_000_000;

    /// @notice HBAR decimal precision on Hedera.
    uint8 internal constant HBAR_DECIMALS = 8;

    /// @notice BTC feed base decimal precision used by this demo conversion.
    uint8 internal constant BTC_DECIMALS = 8;

    /// @notice ETH decimal precision.
    uint8 internal constant ETH_DECIMALS = 18;

    /// @notice USD quote precision used by this demo conversion.
    uint8 internal constant USD_DECIMALS = 6;

    /// @notice Number of decimals to display for HBAR/USD prices.
    uint8 internal constant HBAR_USD_DISPLAY_DECIMALS = 5;

    /// @notice Number of decimals to display for BTC/USD and ETH/USD prices.
    uint8 internal constant MAJOR_USD_DISPLAY_DECIMALS = 2;

    /// @notice Loads deployments, updates Pyth prices, and logs current oracle values.
    function run() external {
        string memory deploymentsJson = _readDeployments();
        OracleRegistry registry = OracleRegistry(_deploymentAddress(deploymentsJson, "OracleRegistry"));
        OracleConsumer consumer = OracleConsumer(_deploymentAddress(deploymentsJson, "OracleConsumer"));
        PythPriceOracleAdapter hbarUsdAdapter =
            PythPriceOracleAdapter(_deploymentAddress(deploymentsJson, "PythHbarUsdAdapter"));
        PythPriceOracleAdapter btcUsdAdapter =
            PythPriceOracleAdapter(_deploymentAddress(deploymentsJson, "PythBtcUsdAdapter"));
        PythPriceOracleAdapter ethUsdAdapter =
            PythPriceOracleAdapter(_deploymentAddress(deploymentsJson, "PythEthUsdAdapter"));
        HelperConfig.PythConfig memory pyth = new HelperConfig().getConfig().pyth;

        console2.log("Chain ID:", block.chainid);
        console2.log("OracleRegistry:", address(registry));
        console2.log("OracleConsumer:", address(consumer));
        console2.log("");
        console2.log("Updating Pyth prices...");

        vm.startBroadcast();
        _updatePythPrice(pyth.pyth, pyth.hbarUsdPriceId, hbarUsdAdapter);
        _updatePythPrice(pyth.pyth, pyth.btcUsdPriceId, btcUsdAdapter);
        _updatePythPrice(pyth.pyth, pyth.ethUsdPriceId, ethUsdAdapter);
        vm.stopBroadcast();

        console2.log("Pyth price updates complete.");

        _logPair(registry, consumer, "HBAR", "USD", ONE_HBAR, HBAR_DECIMALS, HBAR_USD_DISPLAY_DECIMALS);
        _logPair(registry, consumer, "BTC", "USD", ONE_BTC, BTC_DECIMALS, MAJOR_USD_DISPLAY_DECIMALS);
        _logPair(registry, consumer, "ETH", "USD", ONE_ETH, ETH_DECIMALS, MAJOR_USD_DISPLAY_DECIMALS);
    }

    /// @notice Updates one Pyth price feed through its deployed adapter.
    /// @param pyth Pyth EVM contract address.
    /// @param priceId Pyth price feed ID to update.
    /// @param adapter Deployed adapter used to forward the update payload.
    function _updatePythPrice(address pyth, bytes32 priceId, PythPriceOracleAdapter adapter) private {
        bytes[] memory updateData = _fetchPythUpdateData(priceId);
        uint256 updateFee = IPyth(pyth).getUpdateFee(updateData);

        adapter.updatePrice{ value: _nativeValueForPythUpdate(updateFee) }(updateData);
    }

    /// @notice Rounds small non-zero Pyth fees up to Hedera's minimum native transfer amount.
    /// @param updateFee Native token amount required by Pyth.
    /// @return nativeValue Native token amount to send with the Pyth update transaction.
    function _nativeValueForPythUpdate(uint256 updateFee) private pure returns (uint256 nativeValue) {
        if (updateFee == 0 || updateFee >= HEDERA_MIN_NON_ZERO_VALUE) {
            return updateFee;
        }

        return HEDERA_MIN_NON_ZERO_VALUE;
    }

    /// @notice Fetches fresh Hermes update data for one Pyth price ID.
    /// @param priceId Pyth price feed ID.
    /// @return updateData Pyth update payloads encoded as `bytes[]`.
    function _fetchPythUpdateData(bytes32 priceId) private returns (bytes[] memory updateData) {
        string[] memory inputs = new string[](FETCH_PYTH_UPDATE_DATA_COMMAND_LENGTH);
        inputs[0] = "node";
        inputs[1] = "scripts-js/fetchPythUpdateData.js";
        inputs[2] = vm.toString(priceId);

        return abi.decode(vm.ffi(inputs), (bytes[]));
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

    /// @notice Logs registry price data and example conversions for one Pyth pair.
    /// @param registry Deployed oracle registry.
    /// @param consumer Deployed oracle consumer demo.
    /// @param baseSymbol Canonical base symbol.
    /// @param quoteSymbol Canonical quote symbol.
    /// @param oneBaseAmount One whole base asset amount in smallest units.
    /// @param baseDecimals Base asset decimals.
    /// @param usdDisplayDecimals Number of decimal places to display for USD amounts.
    function _logPair(
        OracleRegistry registry,
        OracleConsumer consumer,
        string memory baseSymbol,
        string memory quoteSymbol,
        uint256 oneBaseAmount,
        uint8 baseDecimals,
        uint8 usdDisplayDecimals
    ) private view {
        bytes32 pairKey = PairLib.pairKey(baseSymbol, quoteSymbol);
        IPriceOracle.PriceData memory data = registry.latestPrice(pairKey, ProviderLib.PYTH);
        uint256 quoteAmount = consumer.baseToQuote(pairKey, ProviderLib.PYTH, oneBaseAmount, baseDecimals, USD_DECIMALS);
        uint256 baseAmount = consumer.quoteToBase(pairKey, ProviderLib.PYTH, ONE_USD, baseDecimals, USD_DECIMALS);

        console2.log("");
        console2.log(string.concat(baseSymbol, "/", quoteSymbol));
        console2.log("  adapter:", registry.getOracle(pairKey, ProviderLib.PYTH));
        console2.log(string.concat("  price: ", _formatUsdPrice(data.priceE18, usdDisplayDecimals)));
        console2.log("  updatedAt:", data.updatedAt);
        console2.log(string.concat("  1 ", baseSymbol, " -> ", _formatUsdAmount(quoteAmount, usdDisplayDecimals)));
        console2.log(string.concat("  1 USD -> ", _formatAssetAmount(baseAmount, baseDecimals), " ", baseSymbol));
        console2.log("  raw priceE18:", data.priceE18);
    }

    /// @notice Compares two strings by hash.
    /// @param left First string.
    /// @param right Second string.
    /// @return isSame True when both strings have identical bytes.
    function _isSameString(string memory left, string memory right) private pure returns (bool isSame) {
        return keccak256(bytes(left)) == keccak256(bytes(right));
    }

    /// @notice Formats a normalized 18-decimal USD price for console output.
    /// @param priceE18 Price scaled to 18 decimals.
    /// @param displayDecimals Number of decimal places to show.
    /// @return formattedPrice Human-readable USD price.
    function _formatUsdPrice(uint256 priceE18, uint8 displayDecimals)
        private
        pure
        returns (string memory formattedPrice)
    {
        return string.concat("$", _formatRoundedDecimal(priceE18, 18, displayDecimals));
    }

    /// @notice Formats a USD quote amount from the demo conversion output.
    /// @param usdAmount USD amount in `USD_DECIMALS` base units.
    /// @param displayDecimals Number of decimal places to show.
    /// @return formattedAmount Human-readable USD amount.
    function _formatUsdAmount(uint256 usdAmount, uint8 displayDecimals)
        private
        pure
        returns (string memory formattedAmount)
    {
        return string.concat("$", _formatRoundedDecimal(usdAmount, USD_DECIMALS, displayDecimals));
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
