// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockAxelarGateway {
    string public lastDestinationChain;
    string public lastDestinationAddress;
    bytes public lastPayload;
    uint256 public callCount;

    function callContract(
        string calldata destinationChain,
        string calldata contractAddress,
        bytes calldata payload
    ) external {
        lastDestinationChain = destinationChain;
        lastDestinationAddress = contractAddress;
        lastPayload = payload;
        callCount++;
    }
}
