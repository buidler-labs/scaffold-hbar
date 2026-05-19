// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title ProviderLib
/// @notice Shared provider keys for the oracle adapters supported by this template.
/// @dev Provider names are represented by deterministic `bytes32` keys so registries can avoid string comparisons.
library ProviderLib {
    /// @notice Returned when a provider name is empty.
    error EmptyProvider();

    /// @notice Provider key for Chainlink oracle adapters.
    bytes32 internal constant CHAINLINK = keccak256("CHAINLINK");

    /// @notice Provider key for Supra oracle adapters.
    bytes32 internal constant SUPRA = keccak256("SUPRA");

    /// @notice Provider key for Pyth oracle adapters.
    bytes32 internal constant PYTH = keccak256("PYTH");

    /// @notice Derives a deterministic provider key from a canonical provider name.
    /// @dev Provider names are expected to be uppercase. The function does not normalize input casing.
    /// @param providerName Canonical uppercase provider name.
    /// @return providerKey Key used by registries and adapters for this provider.
    function providerKey(string memory providerName) internal pure returns (bytes32) {
        if (bytes(providerName).length == 0) {
            revert EmptyProvider();
        }

        return keccak256(bytes(providerName));
    }
}
