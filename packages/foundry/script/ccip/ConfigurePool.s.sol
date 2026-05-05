// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// ─────────────────────────────────────────────────────────────────────────────
// ConfigurePool
//
// Applies one remote chain configuration to a local BurnMintTokenPool.
// Mirrors the rebase-token ConfigurePoolScript signature so the bash
// orchestrator can stay trivial.
// ─────────────────────────────────────────────────────────────────────────────

import { Script, console } from "forge-std/Script.sol";
import { TokenPool } from "@chainlink/contracts-ccip/src/v0.8/ccip/pools/TokenPool.sol";
import { RateLimiter } from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/RateLimiter.sol";

contract ConfigurePool is Script {
    function run(
        address localPool,
        uint64 remoteChainSelector,
        address remotePool,
        address remoteToken,
        bool outboundRateLimiterIsEnabled,
        uint128 outboundRateLimiterCapacity,
        uint128 outboundRateLimiterRate,
        bool inboundRateLimiterIsEnabled,
        uint128 inboundRateLimiterCapacity,
        uint128 inboundRateLimiterRate
    ) external {
        console.log("CCIP pool configuration starting");
        console.log("Chain ID:", block.chainid);
        console.log("Local pool:", localPool);
        console.log("Remote chain selector:", remoteChainSelector);
        console.log("Remote pool:", remotePool);
        console.log("Remote token:", remoteToken);

        bytes[] memory remotePoolAddresses = new bytes[](1);
        remotePoolAddresses[0] = abi.encode(remotePool);

        TokenPool.ChainUpdate[] memory updates = new TokenPool.ChainUpdate[](1);
        updates[0] = TokenPool.ChainUpdate({
            remoteChainSelector: remoteChainSelector,
            remotePoolAddresses: remotePoolAddresses,
            remoteTokenAddress: abi.encode(remoteToken),
            outboundRateLimiterConfig: RateLimiter.Config({
                isEnabled: outboundRateLimiterIsEnabled,
                capacity: outboundRateLimiterCapacity,
                rate: outboundRateLimiterRate
            }),
            inboundRateLimiterConfig: RateLimiter.Config({
                isEnabled: inboundRateLimiterIsEnabled,
                capacity: inboundRateLimiterCapacity,
                rate: inboundRateLimiterRate
            })
        });

        uint64[] memory removes = new uint64[](0);

        vm.startBroadcast();
        console.log("Applying chain update...");
        TokenPool(localPool).applyChainUpdates(removes, updates);
        vm.stopBroadcast();

        console.log("CCIP pool configuration complete");
    }
}
