//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { Script } from "forge-std/Script.sol";
import { HederaToken } from "../contracts/HederaToken.sol";
import "./DeployHelpers.s.sol";

contract DeployHederaToken is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        HederaToken hederaToken = new HederaToken(deployer);
        deployments.push(Deployment("HederaToken", address(hederaToken)));
    }
}
