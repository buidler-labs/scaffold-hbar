//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { HtsTokenCreator } from "../contracts/HtsTokenCreator.sol";
import { ScaffoldETHDeploy } from "./DeployHelpers.s.sol";

contract DeployHtsTokenCreator is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        HtsTokenCreator creator = new HtsTokenCreator();
        deployments.push(Deployment({ name: "HtsTokenCreator", addr: address(creator) }));
    }
}
