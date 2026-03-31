// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import { ScaffoldETHDeploy } from "./DeployHelpers.s.sol";
import { MemejobDCAStrategy } from "../contracts/strategies/MemejobDCAStrategy.sol";

/**
 * @notice Deploys the MemejobDCAStrategy (example execution plugin)
 * @dev yarn deploy --file DeployMemejobDCAStrategy.s.sol
 */
contract DeployMemejobDCAStrategyScript is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        MemejobDCAStrategy strategy = new MemejobDCAStrategy();
        deployments.push(Deployment({ name: "MemejobDCAStrategy", addr: address(strategy) }));
    }
}
