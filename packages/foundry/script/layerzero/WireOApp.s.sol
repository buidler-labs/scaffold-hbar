// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { Script, console } from "forge-std/Script.sol";

import {
    IMessageLibManager,
    SetConfigParam
} from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/IMessageLibManager.sol";
import { IOAppCore } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/interfaces/IOAppCore.sol";
import {
    IOAppOptionsType3,
    EnforcedOptionParam
} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/interfaces/IOAppOptionsType3.sol";
import { OptionsBuilder } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/libs/OptionsBuilder.sol";

import { UlnConfig } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/uln/UlnBase.sol";
import { ExecutorConfig } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/SendLibBase.sol";

import { HelperConfig } from "./HelperConfig.s.sol";

// ─────────────────────────────────────────────────────────────────────────────
// WireOApp
//
// Configures one side of the LayerZero V2 OFT pathway:
//   1. setPeer(remoteEid, remoteOApp)
//   2. setSendLibrary(oapp, remoteEid, sendUln302)
//   3. setReceiveLibrary(oapp, remoteEid, receiveUln302, 0)
//   4. setConfig — ExecutorConfig (configType=1) on sendUln302
//   5. setConfig — UlnConfig (configType=2) on sendUln302 and receiveUln302
//   6. setEnforcedOptions — LZ_RECEIVE gas limit for msgType=1 (token send)
//
// Two run() overloads:
//   • run(local, remote)                  — use LayerZero Labs DVN + Executor.
//   • run(local, remote, dvn, executor)   — use SimpleDVNMock + SimpleExecutorMock
//                                           (address(0) falls back to LZ Labs).
// ─────────────────────────────────────────────────────────────────────────────
contract WireOApp is Script {
    using OptionsBuilder for bytes;

    uint32 internal constant CONFIG_TYPE_EXECUTOR = 1;
    uint32 internal constant CONFIG_TYPE_ULN = 2;

    /// @notice Wire using LayerZero Labs default workers.
    function run(address localOApp, address remoteOApp) external {
        _wire(localOApp, remoteOApp, address(0), address(0));
    }

    /// @notice Wire using custom DVN / Executor (address(0) = LZ Labs default).
    function run(address localOApp, address remoteOApp, address customDvn, address customExecutor) external {
        _wire(localOApp, remoteOApp, customDvn, customExecutor);
    }

    function _wire(address localOApp, address remoteOApp, address customDvn, address customExecutor) internal {
        HelperConfig.NetworkConfig memory cfg = (new HelperConfig()).getConfig();

        address dvn = customDvn == address(0) ? cfg.dvn : customDvn;
        address executor = customExecutor == address(0) ? cfg.executor : customExecutor;

        console.log("Using DVN:", dvn);
        console.log("Using Executor:", executor);

        bytes32 remotePeer = bytes32(uint256(uint160(remoteOApp)));

        vm.startBroadcast();

        IOAppCore(localOApp).setPeer(cfg.remoteEid, remotePeer);
        console.log("setPeer done - remoteEid:", cfg.remoteEid);

        IMessageLibManager ep = IMessageLibManager(cfg.endpointV2);
        ep.setSendLibrary(localOApp, cfg.remoteEid, cfg.sendUln302);
        ep.setReceiveLibrary(localOApp, cfg.remoteEid, cfg.receiveUln302, 0);
        console.log("send/receive libs set");

        _setExecutorConfig(ep, localOApp, cfg.sendUln302, cfg.remoteEid, executor);
        UlnConfig memory ulnCfg = _buildUlnConfig(dvn);
        _setUlnConfig(ep, localOApp, cfg.sendUln302, cfg.remoteEid, ulnCfg, true);
        _setUlnConfig(ep, localOApp, cfg.receiveUln302, cfg.remoteEid, ulnCfg, false);

        EnforcedOptionParam[] memory enforced = new EnforcedOptionParam[](1);
        enforced[0] = EnforcedOptionParam({
            eid: cfg.remoteEid, msgType: 1, options: OptionsBuilder.newOptions().addExecutorLzReceiveOption(80_000, 0)
        });
        IOAppOptionsType3(localOApp).setEnforcedOptions(enforced);
        console.log("enforced options set");

        vm.stopBroadcast();

        console.log("WireOApp complete for oapp:", localOApp);
    }

    function _setExecutorConfig(
        IMessageLibManager _ep,
        address _oapp,
        address _sendLib,
        uint32 _remoteEid,
        address _executor
    ) internal {
        ExecutorConfig memory executorCfg = ExecutorConfig({ maxMessageSize: 10000, executor: _executor });
        SetConfigParam[] memory p = new SetConfigParam[](1);
        p[0] = SetConfigParam({ eid: _remoteEid, configType: CONFIG_TYPE_EXECUTOR, config: abi.encode(executorCfg) });
        _ep.setConfig(_oapp, _sendLib, p);
        console.log("ExecutorConfig set on sendUln302");
    }

    function _buildUlnConfig(address _dvn) private pure returns (UlnConfig memory ulnCfg) {
        address[] memory required = new address[](1);
        required[0] = _dvn;
        ulnCfg = UlnConfig({
            confirmations: 1,
            requiredDVNCount: 1,
            optionalDVNCount: 0,
            optionalDVNThreshold: 0,
            requiredDVNs: required,
            optionalDVNs: new address[](0)
        });
    }

    function _setUlnConfig(
        IMessageLibManager _ep,
        address _oapp,
        address _lib,
        uint32 _remoteEid,
        UlnConfig memory _ulnCfg,
        bool _onSendLib
    ) internal {
        SetConfigParam[] memory p = new SetConfigParam[](1);
        p[0] = SetConfigParam({ eid: _remoteEid, configType: CONFIG_TYPE_ULN, config: abi.encode(_ulnCfg) });
        _ep.setConfig(_oapp, _lib, p);
        console.log(_onSendLib ? "UlnConfig set on sendUln302" : "UlnConfig set on receiveUln302");
    }
}
