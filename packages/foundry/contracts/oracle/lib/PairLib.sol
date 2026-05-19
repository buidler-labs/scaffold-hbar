// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title PairLib
/// @notice Utility functions for deriving deterministic oracle pair keys.
/// @dev Pair symbols are expected to be passed in canonical uppercase form, such as `HBAR` and `USD`.
///      The library does not mutate or uppercase input strings, so mixed-case symbols intentionally produce
///      different keys and should be treated as configuration mistakes by callers.
library PairLib {
    /// @notice Empty string length used for symbol validation.
    uint256 internal constant EMPTY_STRING_LENGTH = 0;

    /// @notice Returned when a base or quote symbol is empty.
    error EmptySymbol();

    /// @notice Derives the deterministic key for a BASE/QUOTE oracle pair.
    /// @dev Uses `abi.encode` to avoid ambiguity between dynamic string inputs.
    /// @param baseSymbol Canonical uppercase base asset symbol, such as `HBAR`.
    /// @param quoteSymbol Canonical uppercase quote asset symbol, such as `USD`.
    /// @return pairKey Key used by registries and adapters for this ordered pair.
    function pairKey(string memory baseSymbol, string memory quoteSymbol) internal pure returns (bytes32) {
        if (bytes(baseSymbol).length == EMPTY_STRING_LENGTH || bytes(quoteSymbol).length == EMPTY_STRING_LENGTH) {
            revert EmptySymbol();
        }

        return keccak256(abi.encode(baseSymbol, quoteSymbol));
    }
}
