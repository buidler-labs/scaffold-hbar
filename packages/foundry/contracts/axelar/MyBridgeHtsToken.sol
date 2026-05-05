// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
pragma experimental ABIEncoderV2;

import { BridgeHtsToken } from "./BridgeHtsToken.sol";
import { IHederaTokenService } from "../hedera/IHederaTokenService.sol";

/**
 * @title MyBridgeHtsToken
 * @notice Default concrete HTS wrapper for the Axelar template. Creates an 18-decimal fungible with
 *         initial supply 0. Fork this file or inherit `BridgeHtsToken` and pass a custom
 *         `IHederaTokenService.HederaToken` to `_createHederaFungible` in your constructor.
 * @dev Deployment transaction must include sufficient `value` for the Hedera `0x167` create fee.
 */
contract MyBridgeHtsToken is BridgeHtsToken {
    /// @notice HTS decimal precision used for the default concrete Axelar template token.
    uint8 internal constant HTS_DECIMALS = 18;

    /// @notice Account allowed to mint more HTS supply through this helper.
    address public immutable owner;

    /// @notice Reverts when a caller other than `owner` tries to mint.
    error MyBridgeHtsToken__NotOwner();

    /// @notice Reverts when the constructor owner is the zero address.
    error MyBridgeHtsToken__ZeroOwner();

    /// @notice Restricts helper administration to the configured owner.
    modifier onlyOwner() {
        if (msg.sender != owner) revert MyBridgeHtsToken__NotOwner();
        _;
    }

    /**
     * @notice Creates the default Hedera HTS bridge token.
     * @dev The deployment transaction must include enough HBAR for HTS token creation. The created token uses
     *      this contract as treasury and supply key holder.
     * @param name_ HTS token name.
     * @param symbol_ HTS token symbol.
     * @param initialOwner Owner of this helper and recipient of any `initialSupply`.
     * @param initialSupply Optional amount minted to `initialOwner` after creation, in HTS base units.
     */
    constructor(string memory name_, string memory symbol_, address initialOwner, int64 initialSupply) payable {
        if (initialOwner == address(0)) revert MyBridgeHtsToken__ZeroOwner();
        owner = initialOwner;

        IHederaTokenService.HederaToken memory spec = _defaultHederaSpec(name_, symbol_);
        _createHederaFungible(spec, 0, int32(int8(int256(uint256(HTS_DECIMALS)))));
        _mintHederaFungibleTo(initialOwner, initialSupply);
    }

    /**
     * @notice Mints additional HTS supply to `to`.
     * @dev This helper keeps mint authority through the HTS supply key. Protect the `owner` key accordingly.
     * @param to Recipient of the minted amount.
     * @param amount Amount to mint in HTS base units.
     */
    function mintTo(address to, int64 amount) external onlyOwner {
        _mintHederaFungibleTo(to, amount);
    }
}
