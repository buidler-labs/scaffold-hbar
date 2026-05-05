// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script, console2 } from "forge-std/Script.sol";
import { IInterchainTokenFactory } from "interchain-token-service/contracts/interfaces/IInterchainTokenFactory.sol";
import { IInterchainTokenService } from "interchain-token-service/contracts/interfaces/IInterchainTokenService.sol";
import { ITokenManagerType } from "interchain-token-service/contracts/interfaces/ITokenManagerType.sol";
import { HelperConfig, NetworkConfig } from "./HelperConfig.s.sol";

/// @notice Registers a local token with Axelar ITS as a custom token.
/// @dev Writes the factory salt and token id to `script/axelar/.salt` and `script/axelar/.tokenid`
///      so later scripts can reuse the exact identifiers. Run once per source token per chain.
contract RegisterCustomToken is Script, HelperConfig {
    /// @notice Default file where the generated Axelar factory salt is persisted.
    string internal constant DEFAULT_SALT_FILE = "script/axelar/.salt";

    /// @notice Default file where the derived Axelar ITS token id is persisted.
    string internal constant DEFAULT_TOKENID_FILE = "script/axelar/.tokenid";

    /**
     * @notice Registers `tokenAddress` with the Axelar Interchain Token Factory on the current chain.
     * @dev If `saltOverride` is zero, the salt is deterministic over this script version, `block.chainid`,
     *      and `tokenAddress`. Use a nonzero `saltOverride` to intentionally create a new token id for
     *      the same local token, for example when relinking a testnet deployment.
     *      If the token id is already registered, the script exits after writing the salt/token id files.
     * @param tokenAddress Local token address to register with ITS.
     * @param tokenManagerType Axelar token manager mode, for example lock/unlock or mint/burn.
     * @param operator Account that controls the derived token manager during setup.
     * @param nativeFee Native value forwarded to `registerCustomToken`; usually zero unless Axelar requires a fee.
     * @param saltOverride Optional nonzero factory salt.
     */
    function run(
        address tokenAddress,
        ITokenManagerType.TokenManagerType tokenManagerType,
        address operator,
        uint256 nativeFee,
        bytes32 saltOverride
    ) external {
        NetworkConfig memory config = getConfigByChainId(block.chainid);
        IInterchainTokenFactory factory = IInterchainTokenFactory(config.interchainTokenFactory);
        IInterchainTokenService service = IInterchainTokenService(config.interchainTokenService);
        bytes32 salt = saltOverride == bytes32(0)
            ? keccak256(abi.encodePacked("axelar-bridge-salt:v1", block.chainid, tokenAddress))
            : saltOverride;
        bytes32 tokenId = factory.linkedTokenId(operator, salt);

        vm.writeFile(DEFAULT_SALT_FILE, string.concat(vm.toString(salt), "\n"));
        vm.writeFile(DEFAULT_TOKENID_FILE, string.concat(vm.toString(tokenId), "\n"));

        try service.registeredTokenAddress(tokenId) returns (address registeredToken) {
            if (registeredToken != address(0)) {
                console2.log("Register Custom Token already registered on", config.axelarName);
                console2.log("Factory salt:");
                console2.logBytes32(salt);
                console2.log("Register Custom Token tokenId:");
                console2.logBytes32(tokenId);
                return;
            }
        } catch {
            console2.log("Token manager does not exist yet; registering custom token");
        }

        vm.startBroadcast();
        bytes32 registeredTokenId =
            factory.registerCustomToken{ value: nativeFee }(salt, tokenAddress, tokenManagerType, operator);
        vm.stopBroadcast();

        console2.log("Generated salt:");
        console2.logBytes32(salt);
        console2.log("Register Custom Token tokenId:");
        console2.logBytes32(registeredTokenId);
    }
}
