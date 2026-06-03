// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@axelar-network/axelar-gmp-sdk-solidity/contracts/executable/AxelarExecutable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IDcaHandler.sol";

/// @title AxelarMessageReceiver
/// @notice Implements the Axelar GMP receiver side of the DCA bridge.
///
///         Deployment order:
///           1. Deploy DcaExecutor.
///           2. Deploy AxelarMessageReceiver(gateway, sourceChain, bridgeSenderAddr, executorAddr).
///           3. Call dcaExecutor.setAuthorizedCaller(receiverAddr).
contract AxelarMessageReceiver is AxelarExecutable {
    string public expectedSourceChain;
    string public expectedSourceAddress;

    IDcaHandler public immutable handler;
    address public owner;

    event ExpectedSourceChainSet(string sourceChain);
    event ExpectedSourceAddressSet(string sourceAddress);
    event MessageReceived(
        string srcChain,
        string srcAddress,
        uint256 indexed planId,
        uint256 amountIn,
        address indexed tokenOut,
        uint256 minAmountOut
    );

    constructor(
        address _gateway,
        string memory _expectedSourceChain,
        string memory _expectedSourceAddress,
        address _handler
    ) AxelarExecutable(_gateway) {
        require(_handler != address(0), "AxelarMessageReceiver: zero handler");
        expectedSourceChain = _expectedSourceChain;
        expectedSourceAddress = _expectedSourceAddress;
        handler = IDcaHandler(_handler);
        owner = msg.sender;
    }

    receive() external payable {}

    modifier onlyOwner() {
        require(msg.sender == owner, "AxelarMessageReceiver: not owner");
        _;
    }

    function withdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "AxelarMessageReceiver: nothing to withdraw");
        (bool ok, ) = owner.call{value: balance}("");
        require(ok, "AxelarMessageReceiver: ETH withdraw failed");
    }

    function withdrawToken(address token) external onlyOwner {
        require(token != address(0), "AxelarMessageReceiver: zero token address");
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "AxelarMessageReceiver: nothing to withdraw");
        require(IERC20(token).transfer(owner, balance), "AxelarMessageReceiver: token transfer failed");
    }

    function setExpectedSourceChain(string memory _sourceChain) external onlyOwner {
        require(bytes(_sourceChain).length > 0, "AxelarMessageReceiver: empty source chain");
        expectedSourceChain = _sourceChain;
        emit ExpectedSourceChainSet(_sourceChain);
    }

    function setExpectedSourceAddress(string memory _sourceAddress) external onlyOwner {
        require(bytes(_sourceAddress).length > 0, "AxelarMessageReceiver: empty source address");
        expectedSourceAddress = _sourceAddress;
        emit ExpectedSourceAddressSet(_sourceAddress);
    }

    function _toLower(string memory s) internal pure returns (string memory) {
        bytes memory b = bytes(s);
        for (uint256 i = 0; i < b.length; i++) {
            if (b[i] >= 0x41 && b[i] <= 0x5A) b[i] = bytes1(uint8(b[i]) + 32);
        }
        return string(b);
    }

    function _execute(
        bytes32 /* commandId */,
        string calldata srcChain,
        string calldata srcAddress,
        bytes calldata payload
    ) internal override {
        require(
            keccak256(bytes(_toLower(srcChain))) == keccak256(bytes(_toLower(expectedSourceChain))),
            "AxelarMessageReceiver: invalid source chain"
        );
        require(
            keccak256(bytes(_toLower(srcAddress))) == keccak256(bytes(_toLower(expectedSourceAddress))),
            "AxelarMessageReceiver: invalid source address"
        );

        (
            uint256 planId,
            uint256 amountIn,
            address tokenOut,
            uint256 minAmountOut
        ) = abi.decode(payload, (uint256, uint256, address, uint256));

        emit MessageReceived(srcChain, srcAddress, planId, amountIn, tokenOut, minAmountOut);

        handler.handleDcaExecution(planId, amountIn, tokenOut, minAmountOut);
    }
}
