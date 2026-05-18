//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import { HederaToken } from "../contracts/HederaToken.sol";
import { ScaffoldETHDeploy } from "./DeployHelpers.s.sol";

contract DeployHederaToken is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        HederaToken hederaToken = new HederaToken(deployer);
        deployments.push(Deployment({ name: "HederaToken", addr: address(hederaToken) }));
    }
}
