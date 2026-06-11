// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGateway.sol";
import "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGasService.sol";
import "./interfaces/IBridgeSender.sol";

/// @title AxelarMessageSender
/// @notice Implements IBridgeSender using the Axelar GMP protocol.
///
///         Deployment order:
///           1. Deploy AxelarMessageSender.
///           2. Deploy DcaOrchestrator(bridgeSenderAddress).
///           3. Call bridgeSender.setAuthorizedCaller(orchestratorAddress).
contract AxelarMessageSender is IBridgeSender {
    IAxelarGateway public immutable gateway;
    IAxelarGasService public immutable gasService;

    string public destinationChain;
    string public destinationAddress;

    address public owner;
    address public authorizedCaller;

    event AuthorizedCallerSet(address indexed caller);
    event DestinationAddressSet(string destinationAddress);

    constructor(
        address _gateway,
        address _gasService,
        string memory _destinationChain,
        string memory _destinationAddress
    ) {
        require(_gateway != address(0), "AxelarMessageSender: zero gateway");
        require(_gasService != address(0), "AxelarMessageSender: zero gas service");

        gateway = IAxelarGateway(_gateway);
        gasService = IAxelarGasService(_gasService);
        destinationChain = _destinationChain;
        destinationAddress = _destinationAddress;
        owner = msg.sender;
    }

    receive() external payable {}

    modifier onlyOwner() {
        require(msg.sender == owner, "AxelarMessageSender: not owner");
        _;
    }

    function setAuthorizedCaller(address caller) external onlyOwner {
        require(caller != address(0), "AxelarMessageSender: zero address");
        authorizedCaller = caller;
        emit AuthorizedCallerSet(caller);
    }

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "AxelarMessageSender: nothing to withdraw");
        (bool ok, ) = owner.call{ value: balance }("");
        require(ok, "AxelarMessageSender: withdraw failed");
    }

    function setDestinationAddress(string memory _destinationAddress) external onlyOwner {
        require(bytes(_destinationAddress).length > 0, "AxelarMessageSender: empty destination");
        destinationAddress = _destinationAddress;
        emit DestinationAddressSet(_destinationAddress);
    }

    /// @inheritdoc IBridgeSender
    function send(
        uint256 planId,
        uint256 amountPerExecution,
        address targetToken,
        uint256 minAmountOut
    ) external payable override {
        require(msg.sender == authorizedCaller, "AxelarMessageSender: not authorized");
        require(msg.value > 0, "AxelarMessageSender: zero value");

        bytes memory payload = abi.encode(planId, amountPerExecution, targetToken, minAmountOut);

        gasService.payNativeGasForContractCall{ value: msg.value }(
            address(this),
            destinationChain,
            destinationAddress,
            payload,
            address(authorizedCaller)
        );

        gateway.callContract(destinationChain, destinationAddress, payload);
    }
}
