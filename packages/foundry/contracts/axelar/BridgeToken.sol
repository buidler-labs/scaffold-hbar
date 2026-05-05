// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { Minter } from "interchain-token-service/contracts/utils/Minter.sol";
import { IERC20MintableBurnable } from "interchain-token-service/contracts/interfaces/IERC20MintableBurnable.sol";

/**
 * @title BridgeToken
 * @notice ERC-20 bridge token used by the Axelar ITS custom-token flow.
 * @dev Deploy on Sepolia for the ERC-20 side of the bridge. After registration and linking,
 *      mintership is expected to be transferred to the Axelar Token Manager.
 */
contract BridgeToken is ERC20, Minter, IERC20MintableBurnable {
    /// @notice Reverts when the initial token owner/minter is the zero address.
    error BridgeToken__ZeroOwner();

    /// @notice ERC-20 decimals used by this bridge token.
    uint8 private constant DECIMALS = 18;

    /**
     * @notice Deploys the ERC-20 bridge token and optionally mints an initial supply.
     * @param name_ ERC-20 token name.
     * @param symbol_ ERC-20 token symbol.
     * @param initialOwner Account that receives minter role and any `initialSupply`.
     * @param initialSupply Amount minted to `initialOwner`, in 18-decimal base units.
     * @param devMinter Optional additional minter used during setup; pass zero address to skip.
     */
    constructor(
        string memory name_,
        string memory symbol_,
        address initialOwner,
        uint256 initialSupply,
        address devMinter
    ) ERC20(name_, symbol_) {
        if (initialOwner == address(0)) revert BridgeToken__ZeroOwner();
        _addMinter(initialOwner);
        if (devMinter != address(0) && devMinter != initialOwner) {
            _addMinter(devMinter);
        }
        if (initialSupply > 0) {
            _mint(initialOwner, initialSupply);
        }
    }

    /// @notice Returns the fixed 18-decimal precision expected by the Axelar custom-token setup.
    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    /**
     * @inheritdoc IERC20MintableBurnable
     * @dev Restricted to accounts with the `Minter` MINTER role, normally the Axelar Token Manager after setup.
     */
    function mint(address to, uint256 amount) external override onlyRole(uint8(Roles.MINTER)) {
        _mint(to, amount);
    }

    /**
     * @inheritdoc IERC20MintableBurnable
     * @dev Restricted to accounts with the `Minter` MINTER role, normally the Axelar Token Manager after setup.
     */
    function burn(address from, uint256 amount) external override onlyRole(uint8(Roles.MINTER)) {
        _burn(from, amount);
    }
}
