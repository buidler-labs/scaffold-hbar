// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import {MemejobDCAVault} from "./MemejobDCAVault.sol";

/**
 * @title MemejobDCAFactory
 * @notice Factory for creating MemeJob DCA vaults
 */
contract MemejobDCAFactory {
  /** Errors */
  error MemejobDCAFactory__AlreadyHasVault();
  error MemejobDCAFactory__InvalidMemejob();

  /** State variables */
  // @dev The MemeJob contract address
  address public immutable memejob;
  // @dev The mapping of user addresses to their vault addresses
  mapping(address => address) public userVault;

  /** Events */
  event VaultCreated(address indexed user, address vault);

  /**
   * @notice Constructor
   * @param _memejob The address of the MemeJob contract
   */
  constructor(address _memejob) {
    if (_memejob == address(0)) revert MemejobDCAFactory__InvalidMemejob();
    memejob = _memejob;
  }

  /**
   * @notice Create a new vault for the user
   * @return vault The address of the new vault
   * @dev The user must not already have a vault
   */
  function createVault() external returns (address vault) {
    if (userVault[msg.sender] != address(0)) revert MemejobDCAFactory__AlreadyHasVault();

    MemejobDCAVault newVault = new MemejobDCAVault(memejob, msg.sender);
    vault = address(newVault);

    userVault[msg.sender] = vault;

    emit VaultCreated(msg.sender, vault);

    return vault;
  }
}
