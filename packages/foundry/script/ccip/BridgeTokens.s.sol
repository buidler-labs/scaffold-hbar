// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// ─────────────────────────────────────────────────────────────────────────────
// BridgeTokens
//
// EOA-driven CCIP send.  Pays the CCIP fee in native gas (msg.value) so no
// LINK top-up is required for a template run.
//
// Vanilla CCT flow (same on every chain, including Hedera once the token is
// a plain ERC20):
//
//   1. token.approve(router, amount)   — standard ERC20 allowance so the
//                                        CCIP Router can call
//                                        token.transferFrom.
//   2. router.ccipSend(...)            — emits the cross-chain message.
// ─────────────────────────────────────────────────────────────────────────────

import { Script, console } from "forge-std/Script.sol";
import { IRouterClient } from "@chainlink/contracts-ccip/contracts/interfaces/IRouterClient.sol";
import { Client } from "@chainlink/contracts-ccip/contracts/libraries/Client.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract BridgeTokens is Script {
    /// @param receiver Destination EOA / contract on the remote chain.
    /// @param destinationChainSelector CCIP chain selector of the destination.
    /// @param tokenToSend ERC20 token on the local chain.
    /// @param amountToSend Amount in the token's own decimals.
    /// @param router Local CCIP router address.
    function run(
        address receiver,
        uint64 destinationChainSelector,
        address tokenToSend,
        uint256 amountToSend,
        address router
    ) external {
        console.log("CCIP token bridge starting...");
        console.log("Source chain ID:", block.chainid);
        console.log("Destination chain selector:", destinationChainSelector);
        console.log("Receiver:", receiver);
        console.log("Token:", tokenToSend);
        console.log("Amount:", amountToSend);
        console.log("Router:", router);

        Client.EVMTokenAmount[] memory tokenAmounts = new Client.EVMTokenAmount[](1);
        tokenAmounts[0] = Client.EVMTokenAmount({ token: tokenToSend, amount: amountToSend });

        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(receiver),
            data: "",
            tokenAmounts: tokenAmounts,
            feeToken: address(0), // native gas
            extraArgs: Client._argsToBytes(Client.GenericExtraArgsV2({ gasLimit: 0, allowOutOfOrderExecution: true }))
        });

        uint256 fee = IRouterClient(router).getFee(destinationChainSelector, message);
        console.log("CCIP fee (native):", fee);

        vm.startBroadcast();

        console.log("Approving router to spend token...");
        IERC20(tokenToSend).approve(router, amountToSend);
        console.log("Sending CCIP message...");
        bytes32 messageId = IRouterClient(router).ccipSend{ value: fee }(destinationChainSelector, message);

        vm.stopBroadcast();

        console.log("CCIP token bridge complete");
        console.log("CCIP messageId:");
        console.logBytes32(messageId);
    }
}
