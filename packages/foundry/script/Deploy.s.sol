// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import {ScaffoldETHDeploy} from "./DeployHelpers.s.sol";
import {MemejobDCAFactory} from "../contracts/MemejobDCAFactory.sol";

/**
 * @notice Main deployment script
 * @dev yarn deploy | forge script script/Deploy.s.sol
 *      Testnet memejob: 0xA3bf9adeC2Fb49fb65C8948Aed71C6bf1c4D61c8
 *      Mainnet memejob: 0x950230ea77Dc168df543609c2349C87dea57e876
 */
contract DeployScript is ScaffoldETHDeploy {
    address constant MEMEJOB_TESTNET = 0xA3bf9adeC2Fb49fb65C8948Aed71C6bf1c4D61c8;
    address constant MEMEJOB_MAINNET = 0x950230ea77Dc168df543609c2349C87dea57e876;

    function run() external ScaffoldEthDeployerRunner {
        address memejob = block.chainid == 296 ? MEMEJOB_TESTNET : MEMEJOB_MAINNET;

        MemejobDCAFactory factory = new MemejobDCAFactory(memejob);
        deployments.push(Deployment({name: "MemejobDCAFactory", addr: address(factory)}));
    }
}
