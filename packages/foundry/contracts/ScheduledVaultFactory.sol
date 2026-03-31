// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import { ScheduledVault } from "./ScheduledVault.sol";

/**
 * @title ScheduledVaultFactory
 * @notice Deploys ScheduledVault instances for users with a chosen execution strategy.
 *         Users may own multiple vaults (different strategies or configurations).
 */
contract ScheduledVaultFactory {
    error ScheduledVaultFactory__InvalidStrategy();

    address internal constant ZERO_ADDRESS = address(0);

    mapping(address => address[]) public userVaults;

    event VaultCreated(address indexed user, address indexed vault, address indexed strategy);

    /// @notice Deploy a new ScheduledVault for msg.sender with the given strategy.
    /// @param _strategy Address of the IExecutionStrategy contract
    /// @return vault Address of the newly deployed vault
    function createVault(address _strategy) external returns (address vault) {
        if (_strategy == ZERO_ADDRESS) revert ScheduledVaultFactory__InvalidStrategy();

        ScheduledVault newVault = new ScheduledVault(_strategy, msg.sender);
        vault = address(newVault);

        userVaults[msg.sender].push(vault);

        emit VaultCreated(msg.sender, vault, _strategy);
    }
}
