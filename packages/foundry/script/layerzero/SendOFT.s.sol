// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { Script, console } from "forge-std/Script.sol";

import { SendParam, MessagingFee, IOFT } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oft/interfaces/IOFT.sol";
import { OptionsBuilder } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/libs/OptionsBuilder.sol";

import { HelperConfig } from "./HelperConfig.s.sol";

// ─────────────────────────────────────────────────────────────────────────────
// SendOFT  (Sepolia → Hedera Testnet direction, forge-driven)
//
// For the reverse direction (Hedera → Sepolia) forge cannot simulate native
// fees correctly due to the JSON-RPC relay's wei/tinybar rescaling.
// That direction is handled by cast send inside bridge-layerzero.sh.
//
// Usage (from packages/foundry):
//   forge script script/layerzero/SendOFT.s.sol:SendOFT \
//     --rpc-url $SEPOLIA_RPC_URL \
//     --account <keystore> \
//     --broadcast \
//     --sig "run(address,address,uint256)" \
//     <SEPOLIA_OFT_ADDR> <RECEIVER_ADDR> <AMOUNT>
// ─────────────────────────────────────────────────────────────────────────────
contract SendOFT is Script {
    using OptionsBuilder for bytes;

    function run(address localOFT, address receiver, uint256 amountLD) external {
        HelperConfig helperConfig = new HelperConfig();
        HelperConfig.NetworkConfig memory cfg = helperConfig.getConfig();

        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(80_000, 0);

        SendParam memory sendParam = SendParam({
            dstEid: cfg.remoteEid,
            to: bytes32(uint256(uint160(receiver))),
            amountLD: amountLD,
            minAmountLD: (amountLD * 9) / 10, // 10 % max slippage
            extraOptions: options,
            composeMsg: "",
            oftCmd: ""
        });

        MessagingFee memory fee = IOFT(localOFT).quoteSend(sendParam, false);
        console.log("LZ fee (native wei):", fee.nativeFee);

        vm.startBroadcast();

        IOFT(localOFT).send{ value: fee.nativeFee }(sendParam, fee, payable(msg.sender));

        vm.stopBroadcast();

        console.log("send tx submitted - track on https://testnet.layerzeroscan.com");
    }
}
