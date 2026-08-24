// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// ─────────────────────────────────────────────────────────────────────────────
// TokenAndPoolDeployer
//
// One-shot deploy + wire of a Burn & Mint CCT on either side of the bridge
// using the vanilla Chainlink template (plain ERC20 on every chain, no HTS
// specialisation yet):
//
//   1. Deploy BurnMintERC20
//   2. Deploy BurnMintTokenPool
//   3. token.grantMintAndBurnRoles(pool)
//   4. RegistryModuleOwnerCustom.registerAdminViaGetCCIPAdmin(token)
//   5. TokenAdminRegistry.acceptAdminRole(token)
//   6. TokenAdminRegistry.setPool(token, pool)
//
// Designed to be called once per chain, by the EOA that will own the token and
// be its CCIPAdmin.  HTS-specific variants live alongside in
// contracts/ccip/ and will be wired through the HTS-specific deploy path.
// ─────────────────────────────────────────────────────────────────────────────

import { Script, console } from "forge-std/Script.sol";
import { BurnMintERC20 } from "@chainlink/contracts/src/v0.8/shared/token/ERC20/BurnMintERC20.sol";
import { IBurnMintERC20 } from "@chainlink/contracts/src/v0.8/shared/token/ERC20/IBurnMintERC20.sol";
import { BurnMintTokenPool } from "@chainlink/contracts-ccip/contracts/pools/BurnMintTokenPool.sol";
import {
    RegistryModuleOwnerCustom
} from "@chainlink/contracts-ccip/contracts/tokenAdminRegistry/RegistryModuleOwnerCustom.sol";
import { TokenAdminRegistry } from "@chainlink/contracts-ccip/contracts/tokenAdminRegistry/TokenAdminRegistry.sol";

import { HelperConfig } from "./HelperConfig.s.sol";

contract TokenAndPoolDeployer is Script {
    function run(string memory name, string memory symbol, uint8 decimalsArg, uint256 preMint)
        external
        returns (address token, address pool)
    {
        HelperConfig helperConfig = new HelperConfig();
        HelperConfig.NetworkConfig memory config = helperConfig.getConfigByChainId(block.chainid);

        console.log("CCIP deploy starting");
        console.log("Chain ID:", block.chainid);

        vm.startBroadcast();

        // 1. Token.
        console.log("Deploying token...");
        BurnMintERC20 erc20 = new BurnMintERC20(name, symbol, decimalsArg, 0, preMint);
        token = address(erc20);

        // 2. Pool.
        console.log("Deploying pool...");
        address[] memory allowlist = new address[](0);
        BurnMintTokenPool btp =
            new BurnMintTokenPool(IBurnMintERC20(token), decimalsArg, allowlist, config.rmnProxy, config.router);
        pool = address(btp);

        console.log("Granting mint and burn roles to pool...");
        erc20.grantMintAndBurnRoles(pool);

        console.log("Registering token admin via RegistryModuleOwnerCustom...");
        RegistryModuleOwnerCustom(config.registryModuleOwnerCustom).registerAdminViaGetCCIPAdmin(token);
        console.log("Accepting token admin role...");
        TokenAdminRegistry(config.tokenAdminRegistry).acceptAdminRole(token);

        console.log("Linking token to pool...");
        TokenAdminRegistry(config.tokenAdminRegistry).setPool(token, pool);

        vm.stopBroadcast();

        console.log("CCIP deploy complete");
        console.log("CCIP_TOKEN=", token);
        console.log("CCIP_POOL=", pool);
    }
}
