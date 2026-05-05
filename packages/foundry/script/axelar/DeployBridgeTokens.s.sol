// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script, console2 } from "forge-std/Script.sol";
import { BridgeToken } from "../../contracts/axelar/BridgeToken.sol";
import { HelperConfig, NetworkConfig } from "./HelperConfig.s.sol";

/// @notice Deploys the ERC-20 bridge token for the Axelar ITS flow.
/// @dev Uses the Axelar config for the currently connected chain.
contract DeployBridgeTokens is Script, HelperConfig {
    /**
     * @notice Deploys the ERC-20 used by the Axelar custom-token bridge.
     * @param name_ ERC-20 token name.
     * @param symbol_ ERC-20 token symbol.
     * @param initialOwner Account that receives the minter role and initial supply.
     * @param initialSupply Amount minted to `initialOwner`, in 18-decimal base units.
     * @param devMinter Optional temporary minter for setup; pass zero address to skip.
     */
    function run(
        string calldata name_,
        string calldata symbol_,
        address initialOwner,
        uint256 initialSupply,
        address devMinter
    ) external {
        NetworkConfig memory config = getConfigByChainId(block.chainid);

        vm.startBroadcast();
        BridgeToken newToken = new BridgeToken(name_, symbol_, initialOwner, initialSupply, devMinter);
        vm.stopBroadcast();

        console2.log("Axelar chain:", config.axelarName);
        console2.log("BridgeToken:", address(newToken));
        console2.log("Initial supply:", initialSupply);
        console2.log("Dev minter:", devMinter);
    }
}
