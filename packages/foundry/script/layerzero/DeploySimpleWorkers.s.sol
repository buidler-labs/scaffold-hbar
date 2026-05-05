// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { Script, console } from "forge-std/Script.sol";

import { ReceiveUln302View } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/uln/uln302/ReceiveUln302View.sol";

import { SimpleDVNMock } from "../../contracts/layerzero/mocks/SimpleDVNMock.sol";
import { SimpleExecutorMock } from "../../contracts/layerzero/mocks/SimpleExecutorMock.sol";

import { HelperConfig } from "./HelperConfig.s.sol";

// ─────────────────────────────────────────────────────────────────────────────
// DeploySimpleWorkers — deploys mock LayerZero workers on the current chain
//
// Follows the LayerZero Labs `simple-workers` pattern (devtools/examples/oft/
// docs/simple-workers) adapted for Foundry: we bypass the whole off-chain
// LayerZero Labs DVN/Executor infrastructure and run the verify→commit→execute
// pipeline manually via `cast` calls in bridge-layerzero.sh.
//
// Three contracts are deployed here, in this order:
//   1. ReceiveUln302View   — needed by SimpleExecutorMock.commitAndExecute
//                            to query verification state of the destination ULN.
//                            `Proxied.proxied` allows the first (and only)
//                            `initialize()` call when the proxy admin slot is 0.
//   2. SimpleDVNMock       — signs/verifies packets on the destination chain.
//   3. SimpleExecutorMock  — permissioned executor for send (fee=0) on the
//                            source side and commit+execute on the destination.
//
// Addresses are logged in a copy-friendly format for `.env`.
// ─────────────────────────────────────────────────────────────────────────────
contract DeploySimpleWorkers is Script {
    function run() external returns (address receiveUlnView, address dvn, address executor) {
        HelperConfig helperConfig = new HelperConfig();
        HelperConfig.NetworkConfig memory cfg = helperConfig.getConfig();

        vm.startBroadcast();

        // 1. Deploy our own ReceiveUln302View, pointing at this chain's ULN.
        //    The view is queried by SimpleExecutorMock to know when a packet is
        //    "Verifiable" / "Verified" / etc.  LayerZero Labs does not publish
        //    view addresses in their metadata API, so we deploy a fresh one.
        ReceiveUln302View recvView = new ReceiveUln302View();
        recvView.initialize(cfg.endpointV2, cfg.receiveUln302);
        console.log("ReceiveUln302View deployed:", address(recvView));

        // 2. SimpleDVNMock(receiveUln, localEid) — Ownable(msg.sender).
        //    It will call receiveUln302.verify(header, payloadHash, 1) when
        //    `verify()` is invoked off-chain by bridge-layerzero.sh.
        SimpleDVNMock dvnMock = new SimpleDVNMock(cfg.receiveUln302, cfg.eid);
        console.log("SimpleDVNMock deployed:", address(dvnMock));

        // 3. SimpleExecutorMock(endpoint, [sendUln302], receiveUln302, view).
        //    Must be granted MESSAGE_LIB_ROLE for the SendUln302 we pass, so
        //    that sendUln can assignJob(...) on it.  The view address is kept
        //    in `receiveLibToView[receiveUln302]` for commitAndExecute().
        address[] memory messageLibs = new address[](1);
        messageLibs[0] = cfg.sendUln302;

        SimpleExecutorMock executorMock =
            new SimpleExecutorMock(cfg.endpointV2, messageLibs, cfg.receiveUln302, address(recvView));
        console.log("SimpleExecutorMock deployed:", address(executorMock));

        vm.stopBroadcast();

        // Copy-friendly markers for bridge-layerzero.sh users.
        console.log("SIMPLE_WORKERS_VIEW=", address(recvView));
        console.log("SIMPLE_WORKERS_DVN=", address(dvnMock));
        console.log("SIMPLE_WORKERS_EXECUTOR=", address(executorMock));

        return (address(recvView), address(dvnMock), address(executorMock));
    }
}
