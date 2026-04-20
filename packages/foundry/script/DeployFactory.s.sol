// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import { ScaffoldETHDeploy } from "./DeployHelpers.s.sol";
import { ScheduledVaultFactory } from "../contracts/ScheduledVaultFactory.sol";

/**
 * @notice Deploys the ScheduledVaultFactory (one-time infra deployment)
 * @dev yarn foundry:deploy --file DeployFactory.s.sol
 */
contract DeployFactoryScript is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        ScheduledVaultFactory factory = new ScheduledVaultFactory();
        deployments.push(Deployment({ name: "ScheduledVaultFactory", addr: address(factory) }));
    }
}
