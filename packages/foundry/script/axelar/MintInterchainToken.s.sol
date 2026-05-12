// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script, console2 } from "forge-std/Script.sol";
import { ITokenManager } from "interchain-token-service/contracts/interfaces/ITokenManager.sol";

/// @notice Mints an ITS-managed token through its TokenManager.
/// @dev Intended for testnet flows where the deployer kept minter rights while proving the bridge.
contract MintInterchainToken is Script {
    function run(address tokenManager, address tokenAddress, address recipient, uint256 amount) external {
        vm.startBroadcast();
        ITokenManager(tokenManager).mintToken(tokenAddress, recipient, amount);
        vm.stopBroadcast();

        console2.log("MintInterchainToken token manager:", tokenManager);
        console2.log("MintInterchainToken token:", tokenAddress);
        console2.log("MintInterchainToken recipient:", recipient);
        console2.log("MintInterchainToken amount:", amount);
    }
}
