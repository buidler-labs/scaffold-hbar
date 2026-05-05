// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { Script, console } from "forge-std/Script.sol";

import { MyOFT } from "../../contracts/layerzero/MyOFT.sol";
import { MyHTSConnectorOFT } from "../../contracts/layerzero/hts/MyHTSConnectorOFT.sol";
import { HelperConfig } from "./HelperConfig.s.sol";

// ─────────────────────────────────────────────────────────────────────────────
// DeployOFT
//
// Branches on block.chainid:
//   • Sepolia (11155111)  → MyOFT (standard ERC-20 OFT, no HTS)
//   • Hedera  (296)       → MyHTSConnectorOFT (creates a native HTS token)
//
// Hedera note: the constructor call is sent with msg.value = 20 ether.
// Hedera's JSON-RPC relay divides the transaction value by 10^10 before the
// EVM sees it, so the contract receives ~20 HBAR — enough to pay the HTS
// token-creation precompile fee (~15 HBAR).
//
// IMPORTANT about msg.sender:
//   When invoking this script you MUST pass BOTH --account <keystore> AND
//   --sender <EOA>. `--account` only selects the signing key; without
//   `--sender`, simulation still runs with forge's DEFAULT_SENDER
//   (0x1804c8AB1F12E6bbf3894d4083f33e07309d1f38), which would leak into
//   `msg.sender` here and become the contract owner.
//
//   Example:
//     EOA=$(cast wallet address --account baditu-dev)
//     forge script .../DeployOFT.s.sol:DeployOFT \
//       --account baditu-dev --sender "$EOA" --broadcast \
//       --sig "run(string,string,uint256)" "BridgeToken" "BTK" 1e18
// ─────────────────────────────────────────────────────────────────────────────
contract DeployOFT is Script {
    function run(string memory name, string memory symbol, uint256 preMint) external returns (address deployedOFT) {
        HelperConfig helperConfig = new HelperConfig();
        HelperConfig.NetworkConfig memory cfg = helperConfig.getConfig();

        vm.startBroadcast();

        if (block.chainid == 296) {
            // Hedera Testnet — HTS Connector OFT
            // Send 20 ether through the relay; the EVM sees ~20 HBAR after 1e10 rescaling.
            MyHTSConnectorOFT htsOFT =
                new MyHTSConnectorOFT{ value: 20 ether }(name, symbol, cfg.endpointV2, msg.sender);
            deployedOFT = address(htsOFT);
            console.log("MyHTSConnectorOFT deployed:", deployedOFT);
            console.log("HTS native token:", htsOFT.htsTokenAddress());
            console.log("Owner/Delegate:", msg.sender);
        } else {
            // Sepolia (or any standard EVM) — plain ERC-20 OFT
            MyOFT oft = new MyOFT(name, symbol, cfg.endpointV2, msg.sender, preMint);
            deployedOFT = address(oft);
            console.log("MyOFT deployed:", deployedOFT);
            console.log("Owner:", msg.sender);
        }

        vm.stopBroadcast();
    }
}
