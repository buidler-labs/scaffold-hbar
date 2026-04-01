// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import { ScaffoldETHDeploy } from "./DeployHelpers.s.sol";
import { ScheduledVaultFactory } from "../contracts/ScheduledVaultFactory.sol";
import { MemejobDCAStrategy } from "../contracts/strategies/MemejobDCAStrategy.sol";

/**
 * @notice One-shot deploy: ScheduledVaultFactory + MemejobDCAStrategy (default `yarn deploy`)
 * @dev For individual deploys use `DeployFactory.s.sol` or `DeployMemejobDCAStrategy.s.sol`
 */
contract DeployScript is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        ScheduledVaultFactory factory = new ScheduledVaultFactory();
        deployments.push(Deployment({ name: "ScheduledVaultFactory", addr: address(factory) }));

        MemejobDCAStrategy strategy = new MemejobDCAStrategy();
        deployments.push(Deployment({ name: "MemejobDCAStrategy", addr: address(strategy) }));
    }
}
