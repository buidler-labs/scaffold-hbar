// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script, console2 } from "forge-std/Script.sol";
import { IInterchainTokenService } from "interchain-token-service/contracts/interfaces/IInterchainTokenService.sol";
import { HelperConfig, NetworkConfig } from "./HelperConfig.s.sol";

/// @notice `InterchainTokenService.registerTokenMetadata` on the *current* chain. Callable once per custom token; required before `linkToken`.
/// @dev On **Hedera**, `forge script` fails in revm (ITS reads `decimals()` → HTS `0x167`). Use `make axelar-metadata-hedera` (`cast send`).
contract RegisterTokenMetadata is Script, HelperConfig {
    /**
     * @notice Registers the token metadata Axelar ITS needs before remote linking.
     * @param token Local token address whose name, symbol, and decimals are registered.
     * @param gasValue Second argument to ITS; cross-chain gas amount/routing value per Axelar deployment.
     * @param nativeFee Native fee forwarded as `msg.value` to ITS.
     */
    function run(address token, uint256 gasValue, uint256 nativeFee) external {
        NetworkConfig memory config = getConfigByChainId(block.chainid);
        IInterchainTokenService interchainTokenService = IInterchainTokenService(config.interchainTokenService);
        vm.startBroadcast();
        interchainTokenService.registerTokenMetadata{ value: nativeFee }(token, gasValue);
        vm.stopBroadcast();
        console2.log("Register Token Metadata on ", config.axelarName, " done for:", token);
    }
}
