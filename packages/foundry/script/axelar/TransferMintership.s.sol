// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script, console2 } from "forge-std/Script.sol";
import { IInterchainTokenService } from "interchain-token-service/contracts/interfaces/IInterchainTokenService.sol";
import { IMinter } from "interchain-token-service/contracts/interfaces/IMinter.sol";
import { HelperConfig, NetworkConfig } from "./HelperConfig.s.sol";

/// @notice Transfers minter on the **local** chain token to the Axelar Token Manager for `tokenId`. Run on both
///         Hedera and Sepolia. If `tokenId` is zero, reads `script/axelar/.tokenid` (hex `bytes32` from `make axelar-register-custom`).
contract TransferMintership is Script, HelperConfig {
    /// @notice Default file read when `run` receives a zero token id.
    string internal constant DEFAULT_TOKENID_FILE = "script/axelar/.tokenid";

    /**
     * @notice Transfers local mint authority from the caller/admin to the Axelar token manager.
     * @dev `bridgeToken` must implement the Axelar ITS `IMinter` interface. Run only after the token manager
     *      exists for `tokenId`, otherwise the script reverts.
     * @param tokenId Axelar ITS token id; pass zero to read `script/axelar/.tokenid`.
     * @param bridgeToken Local token or helper whose mintership should be transferred to the token manager.
     */
    function run(bytes32 tokenId, address bridgeToken) external {
        bytes32 id = tokenId;
        if (id == bytes32(0)) {
            id = vm.parseBytes32(vm.trim(vm.readFile(DEFAULT_TOKENID_FILE)));
        }
        NetworkConfig memory config = getConfigByChainId(block.chainid);
        IInterchainTokenService interchainTokenService = IInterchainTokenService(config.interchainTokenService);
        address tokenManager = interchainTokenService.tokenManagerAddress(id);
        require(tokenManager != address(0), "TransferMintership: no token manager");
        vm.startBroadcast();
        IMinter(bridgeToken).transferMintership(tokenManager);
        vm.stopBroadcast();
        console2.log("Transfer Mintership on", config.axelarName, "done for:", tokenManager);
    }
}
