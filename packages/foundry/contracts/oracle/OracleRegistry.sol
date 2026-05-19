// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IPriceOracle } from "./interfaces/IPriceOracle.sol";

/// @title OracleRegistry
/// @notice Owner-managed registry that resolves oracle adapters by pair and provider.
/// @dev Adapters are validated during registration by reading their normalized `latestPrice()` metadata.
contract OracleRegistry is Ownable {
    /// @notice Zero address used for adapter validation.
    address internal constant ZERO_ADDRESS = address(0);

    /// @notice Returned when an adapter address is zero.
    error OracleAdapterIsZero();

    /// @notice Returned when no adapter is registered for a pair/provider key.
    /// @param pairKey Pair key requested by the caller.
    /// @param providerKey Provider key requested by the caller.
    error OracleAdapterNotFound(bytes32 pairKey, bytes32 providerKey);

    /// @notice Returned when an adapter reports a different pair key than the registry entry.
    /// @param expectedPairKey Pair key requested during registration.
    /// @param actualPairKey Pair key reported by the adapter.
    error OracleAdapterPairMismatch(bytes32 expectedPairKey, bytes32 actualPairKey);

    /// @notice Returned when an adapter reports a different provider key than the registry entry.
    /// @param expectedProviderKey Provider key requested during registration.
    /// @param actualProviderKey Provider key reported by the adapter.
    error OracleAdapterProviderMismatch(bytes32 expectedProviderKey, bytes32 actualProviderKey);

    /// @notice Emitted when an adapter is registered or replaced.
    /// @param pairKey Pair key served by the adapter.
    /// @param providerKey Provider key backing the adapter.
    /// @param adapter Address of the registered adapter.
    event OracleAdapterRegistered(bytes32 indexed pairKey, bytes32 indexed providerKey, address indexed adapter);

    /// @notice Emitted when an adapter is removed.
    /// @param pairKey Pair key that no longer has an adapter for the provider.
    /// @param providerKey Provider key removed from the registry for the pair.
    /// @param adapter Address of the removed adapter.
    event OracleAdapterRemoved(bytes32 indexed pairKey, bytes32 indexed providerKey, address indexed adapter);

    mapping(bytes32 pairKey => mapping(bytes32 providerKey => address adapter)) private adapters;

    /// @notice Sets the initial owner allowed to mutate registry entries.
    /// @param initialOwner Account that receives registry ownership.
    constructor(address initialOwner) Ownable(initialOwner) { }

    /// @notice Registers or replaces an oracle adapter for a pair/provider key.
    /// @dev Calls `latestPrice()` on the adapter and requires its reported pair and provider keys to match.
    /// @param pairKey Pair key served by the adapter.
    /// @param providerKey Provider key backing the adapter.
    /// @param adapter Address of the adapter to register.
    function registerOracle(bytes32 pairKey, bytes32 providerKey, address adapter) external onlyOwner {
        if (adapter == ZERO_ADDRESS) {
            revert OracleAdapterIsZero();
        }

        IPriceOracle.PriceData memory data = IPriceOracle(adapter).latestPrice();

        if (data.pairKey != pairKey) {
            revert OracleAdapterPairMismatch(pairKey, data.pairKey);
        }

        if (data.providerKey != providerKey) {
            revert OracleAdapterProviderMismatch(providerKey, data.providerKey);
        }

        adapters[pairKey][providerKey] = adapter;

        emit OracleAdapterRegistered(pairKey, providerKey, adapter);
    }

    /// @notice Removes the adapter registered for a pair/provider key.
    /// @param pairKey Pair key to remove.
    /// @param providerKey Provider key to remove.
    function removeOracle(bytes32 pairKey, bytes32 providerKey) external onlyOwner {
        address adapter = _getOracle(pairKey, providerKey);

        delete adapters[pairKey][providerKey];

        emit OracleAdapterRemoved(pairKey, providerKey, adapter);
    }

    /// @notice Returns the adapter registered for a pair/provider key.
    /// @param pairKey Pair key to resolve.
    /// @param providerKey Provider key to resolve.
    /// @return adapter Address of the registered adapter.
    function getOracle(bytes32 pairKey, bytes32 providerKey) external view returns (address adapter) {
        return _getOracle(pairKey, providerKey);
    }

    /// @notice Reads the latest normalized price from the adapter registered for a pair/provider key.
    /// @param pairKey Pair key to read.
    /// @param providerKey Provider key to read.
    /// @return data Normalized price data returned by the registered adapter.
    function latestPrice(bytes32 pairKey, bytes32 providerKey)
        external
        view
        returns (IPriceOracle.PriceData memory data)
    {
        return IPriceOracle(_getOracle(pairKey, providerKey)).latestPrice();
    }

    /// @notice Resolves an adapter or reverts if none is registered.
    /// @param pairKey Pair key to resolve.
    /// @param providerKey Provider key to resolve.
    /// @return adapter Address of the registered adapter.
    function _getOracle(bytes32 pairKey, bytes32 providerKey) private view returns (address adapter) {
        adapter = adapters[pairKey][providerKey];

        if (adapter == ZERO_ADDRESS) {
            revert OracleAdapterNotFound(pairKey, providerKey);
        }
    }
}
