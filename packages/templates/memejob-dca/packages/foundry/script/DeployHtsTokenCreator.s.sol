//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Script } from "forge-std/Script.sol";
import { HtsTokenCreator } from "../contracts/HtsTokenCreator.sol";
import "./DeployHelpers.s.sol";

contract DeployHtsTokenCreator is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        HtsTokenCreator creator = new HtsTokenCreator();
        deployments.push(Deployment("HtsTokenCreator", address(creator)));
    }
}
