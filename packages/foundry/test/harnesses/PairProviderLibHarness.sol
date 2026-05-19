// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { PairLib } from "../../contracts/oracle/lib/PairLib.sol";
import { ProviderLib } from "../../contracts/oracle/lib/ProviderLib.sol";

contract PairProviderLibHarness {
    function pairKey(string memory baseSymbol, string memory quoteSymbol) external pure returns (bytes32) {
        return PairLib.pairKey(baseSymbol, quoteSymbol);
    }

    function providerKey(string memory providerName) external pure returns (bytes32) {
        return ProviderLib.providerKey(providerName);
    }
}
