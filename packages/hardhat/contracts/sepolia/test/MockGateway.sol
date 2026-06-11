// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev Test gateway: always approves any contract call so AxelarExecutable.execute() passes.
contract MockGateway {
    function validateContractCall(bytes32, string calldata, string calldata, bytes32) external pure returns (bool) {
        return true;
    }

    function validateContractCallAndMint(
        bytes32,
        string calldata,
        string calldata,
        bytes32,
        string calldata,
        uint256
    ) external pure returns (bool) {
        return true;
    }

    function callContract(string calldata, string calldata, bytes calldata) external {}
}
