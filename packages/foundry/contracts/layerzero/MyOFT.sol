// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { OFT } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oft/OFT.sol";

/**
 * @title MyOFT
 * @notice Standard Omnichain Fungible Token deployed on Sepolia (chain ID 11155111).
 *         On the Hedera side the counterpart is MyHTSConnectorOFT which wraps a native
 *         HTS fungible token instead of a plain ERC-20.
 *
 * @dev OAppCore inherits OZ v5 Ownable but does not call Ownable(owner) in its constructor,
 *      so the concrete contract must explicitly invoke Ownable(_owner) here.
 */
contract MyOFT is OFT {
    constructor(string memory _name, string memory _symbol, address _lzEndpoint, address _owner, uint256 _preMint)
        OFT(_name, _symbol, _lzEndpoint, _owner)
        Ownable(_owner)
    {
        if (_preMint > 0) {
            _mint(_owner, _preMint);
        }
    }
}
