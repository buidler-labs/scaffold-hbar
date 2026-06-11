// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IBridgeSender.sol";
import "./interfaces/IHederaScheduleService.sol";

contract DcaOrchestrator {
    // Hedera Schedule Service system contract (HIP-1215)
    address private constant HEDERA_SCHEDULE_SERVICE = address(0x16b);
    // Hedera response code for SUCCESS
    int64 private constant RESPONSE_SUCCESS = 22;

    struct DcaPlan {
        address owner;
        uint256 amountPerExecution;
        uint256 feeForSender;
        uint256 intervalSeconds;
        address targetToken;
        uint256 minAmountOut;
        uint64 maxExecutions;
        uint64 executionCount;
        bool active;
        uint256 lastExecutionTime;
    }

    IBridgeSender public immutable bridgeSender;
    address public owner;
    mapping(uint256 => DcaPlan) public plans;
    uint256 public nextPlanId;

    event PlanCreated(
        uint256 indexed planId,
        address indexed owner,
        uint256 amountPerExecution,
        uint256 feeForSender,
        uint256 intervalSeconds,
        address indexed targetToken
    );
    event PlanCancelled(uint256 indexed planId, address indexed owner);
    event ExecutionTriggered(uint256 indexed planId, uint64 executionCount);
    event ScheduleAttempted(uint256 indexed planId, int64 responseCode, bool success);

    constructor(address _bridgeSender) {
        require(_bridgeSender != address(0), "DcaOrchestrator: zero bridge sender");
        bridgeSender = IBridgeSender(_bridgeSender);
        owner = msg.sender;
    }

    receive() external payable {}

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "DcaOrchestrator: nothing to withdraw");
        (bool ok, ) = owner.call{ value: balance }("");
        require(ok, "DcaOrchestrator: withdraw failed");
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "DcaOrchestrator: not owner");
        _;
    }

    modifier onlyPlanOwner(uint256 planId) {
        require(plans[planId].owner == msg.sender, "DcaOrchestrator: not plan owner");
        _;
    }

    function createPlan(
        uint256 amountPerExecution,
        uint256 feeForSender,
        uint256 intervalSeconds,
        address targetToken,
        uint256 minAmountOut,
        uint64 maxExecutions
    ) external returns (uint256 planId) {
        require(amountPerExecution > 0, "DcaOrchestrator: amount must be > 0");
        require(feeForSender > 0, "DcaOrchestrator: fee must be > 0");
        require(intervalSeconds > 0, "DcaOrchestrator: interval must be > 0");
        require(targetToken != address(0), "DcaOrchestrator: invalid target token");

        planId = nextPlanId++;

        plans[planId] = DcaPlan({
            owner: msg.sender,
            amountPerExecution: amountPerExecution,
            feeForSender: feeForSender,
            intervalSeconds: intervalSeconds,
            targetToken: targetToken,
            minAmountOut: minAmountOut,
            maxExecutions: maxExecutions,
            executionCount: 0,
            active: true,
            lastExecutionTime: 0
        });

        emit PlanCreated(planId, msg.sender, amountPerExecution, feeForSender, intervalSeconds, targetToken);
        _scheduleNextExecution(planId);
    }

    function cancelPlan(uint256 planId) external onlyPlanOwner(planId) {
        plans[planId].active = false;
        emit PlanCancelled(planId, msg.sender);
    }

    function executeDca(uint256 planId) external {
        DcaPlan storage plan = plans[planId];
        require(plan.active, "DcaOrchestrator: plan not active");
        require(block.timestamp >= plan.lastExecutionTime + plan.intervalSeconds, "DcaOrchestrator: too soon");

        plan.lastExecutionTime = block.timestamp;
        plan.executionCount += 1;
        emit ExecutionTriggered(planId, plan.executionCount);

        _dispatchViaBridge(planId);

        if (plan.maxExecutions > 0 && plan.executionCount >= plan.maxExecutions) {
            plan.active = false;
            emit PlanCancelled(planId, plan.owner);
        } else {
            _scheduleNextExecution(planId);
        }
    }

    function _dispatchViaBridge(uint256 planId) internal {
        DcaPlan storage plan = plans[planId];
        bridgeSender.send{ value: plan.feeForSender }(
            planId,
            plan.amountPerExecution,
            plan.targetToken,
            plan.minAmountOut
        );
    }

    function _scheduleNextExecution(uint256 planId) internal virtual {
        DcaPlan storage plan = plans[planId];

        bytes memory callData = abi.encodeWithSelector(this.executeDca.selector, planId);
        uint256 expiry = block.timestamp + plan.intervalSeconds;

        (int64 code, ) = IHederaScheduleService(HEDERA_SCHEDULE_SERVICE).scheduleCall(
            address(this),
            expiry,
            4_000_000,
            0,
            callData
        );

        bool ok = (code == RESPONSE_SUCCESS);
        emit ScheduleAttempted(planId, code, ok);
    }
}
