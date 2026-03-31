// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract MockHederaScheduleService {
    int64 internal constant SUCCESS = 22;

    bool public hasCapacity = true;
    int64 public scheduleResponseCode = SUCCESS;
    int64 public deleteResponseCode = SUCCESS;
    uint256 public nextScheduleId = 1;

    address public lastDeletedSchedule;
    address public lastScheduleTo;
    uint256 public lastScheduleExpirySecond;
    uint256 public lastScheduleGasLimit;
    uint64 public lastScheduleValue;
    bytes public lastScheduleCallData;

    function setHasCapacity(bool value) external {
        hasCapacity = value;
    }

    function setScheduleResponseCode(int64 value) external {
        scheduleResponseCode = value;
    }

    function setDeleteResponseCode(int64 value) external {
        deleteResponseCode = value;
    }

    function hasScheduleCapacity(uint256, uint256) external view returns (bool) {
        return hasCapacity;
    }

    function scheduleCall(address to, uint256 expirySecond, uint256 gasLimit, uint64 value, bytes memory callData)
        external
        returns (int64 responseCode, address scheduleAddress)
    {
        lastScheduleTo = to;
        lastScheduleExpirySecond = expirySecond;
        lastScheduleGasLimit = gasLimit;
        lastScheduleValue = value;
        lastScheduleCallData = callData;

        if (scheduleResponseCode != SUCCESS) {
            return (scheduleResponseCode, address(0));
        }

        // forge-lint: disable-next-line(unsafe-typecast)
        scheduleAddress = address(uint160(nextScheduleId + 0x1000));
        nextScheduleId++;
        return (SUCCESS, scheduleAddress);
    }

    function deleteSchedule(address scheduleAddress) external returns (int64 responseCode) {
        lastDeletedSchedule = scheduleAddress;
        return deleteResponseCode;
    }
}
