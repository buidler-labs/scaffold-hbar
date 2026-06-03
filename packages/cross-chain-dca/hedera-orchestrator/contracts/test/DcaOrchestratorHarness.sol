// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../DcaOrchestrator.sol";

/// @dev Test harness that stubs out the Hedera Schedule Service call so unit tests
///      run on a plain Hardhat network without the 0x16b precompile.
contract DcaOrchestratorHarness is DcaOrchestrator {
    uint256 public scheduleCallCount;

    constructor(address _bridgeSender) DcaOrchestrator(_bridgeSender) {}

    function _scheduleNextExecution(uint256 /*planId*/) internal override {
        scheduleCallCount++;
    }
}
