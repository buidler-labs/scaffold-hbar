//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import { HederaToken } from "../contracts/HederaToken.sol";
import { HtsTokenCreator } from "../contracts/HtsTokenCreator.sol";

/**
 * @notice Main deployment script for all contracts
 * @dev Run this when you want to deploy multiple contracts at once
 *
 * Example: yarn deploy # runs this script(without `--file` flag)
 */
contract DeployScript is ScaffoldETHDeploy {
  function run() external ScaffoldEthDeployerRunner {
    HederaToken hederaToken = new HederaToken(deployer);
    deployments.push(Deployment("HederaToken", address(hederaToken)));

    HtsTokenCreator creator = new HtsTokenCreator();
    deployments.push(Deployment("HtsTokenCreator", address(creator)));
  }
}
