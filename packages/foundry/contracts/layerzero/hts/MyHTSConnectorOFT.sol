// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { HTSConnector } from "./HTSConnector.sol";

/**
 * @title MyHTSConnectorOFT
 * @notice Concrete LayerZero OFT deployed on Hedera Testnet.
 *         The parent HTSConnector constructor creates a native HTS fungible token
 *         (18 decimals, infinite supply, zero initial supply, supply-key = this contract).
 *         Tokens are minted on receive and burned on send — no pre-mint on deployment.
 *
 * @dev The deploy script must send >= 20 HBAR with the deployment transaction
 *      (i.e. value: 20 ether through the JSON-RPC relay, which rescales to ~20 HBAR
 *      inside the EVM) so the HTS precompile fee is covered.
 *      Before calling `send`, the user must call `approve(connector, amount)` on the
 *      HTS token address (returned by `token()`) to grant the connector an allowance.
 */
contract MyHTSConnectorOFT is HTSConnector {
    constructor(string memory _name, string memory _symbol, address _lzEndpoint, address _delegate)
        payable
        HTSConnector(_name, _symbol, _lzEndpoint, _delegate)
        Ownable(_delegate)
    { }
}
