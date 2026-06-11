// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockAxelarGasService {
    address public lastSender;
    string public lastDestinationChain;
    string public lastDestinationAddress;
    bytes public lastPayload;
    address public lastRefundAddress;
    uint256 public lastValue;
    uint256 public callCount;

    function payNativeGasForContractCall(
        address sender,
        string calldata destinationChain,
        string calldata destinationAddress,
        bytes calldata payload,
        address refundAddress
    ) external payable {
        lastSender = sender;
        lastDestinationChain = destinationChain;
        lastDestinationAddress = destinationAddress;
        lastPayload = payload;
        lastRefundAddress = refundAddress;
        lastValue = msg.value;
        callCount++;
    }
}
