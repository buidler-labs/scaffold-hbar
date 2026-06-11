// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { AddressBytes } from "@axelar-network/axelar-gmp-sdk-solidity/contracts/libs/AddressBytes.sol";

import { HelperConfig, NetworkConfig } from "../../script/axelar/HelperConfig.s.sol";
import { SendInterchainTransfer } from "../../script/axelar/SendInterchainTransfer.s.sol";

contract MockInterchainTokenService {
    bytes32 public lastTokenId;
    string public lastDestinationChain;
    bytes public lastDestinationAddress;
    uint256 public lastAmount;
    bytes public lastMetadata;
    uint256 public lastGasValue;
    uint256 public lastNativeFee;

    mapping(bytes32 tokenId => address tokenAddress) public registeredTokens;

    function setRegisteredToken(bytes32 tokenId, address tokenAddress) external {
        registeredTokens[tokenId] = tokenAddress;
    }

    function registeredTokenAddress(bytes32 tokenId) external view returns (address tokenAddress) {
        return registeredTokens[tokenId];
    }

    function interchainTransfer(
        bytes32 tokenId,
        string calldata destinationChain,
        bytes calldata destinationAddress,
        uint256 amount,
        bytes calldata metadata,
        uint256 gasValue
    ) external payable {
        require(destinationAddress.length == 20, "destination address must be 20 bytes");

        lastTokenId = tokenId;
        lastDestinationChain = destinationChain;
        lastDestinationAddress = destinationAddress;
        lastAmount = amount;
        lastMetadata = metadata;
        lastGasValue = gasValue;
        lastNativeFee = msg.value;
    }
}

contract AxelarScriptLocalTest is Test {
    using AddressBytes for bytes;

    uint256 internal constant SEPOLIA_CHAIN_ID = 11_155_111;

    HelperConfig internal helper;
    MockInterchainTokenService internal service;

    function setUp() public {
        helper = new HelperConfig();
    }

    function test_sendInterchainTransfer_encodesRecipientAsTwentyByteAddress() public {
        NetworkConfig memory config = helper.getConfigByChainId(SEPOLIA_CHAIN_ID);
        service = MockInterchainTokenService(config.interchainTokenService);
        vm.etch(address(service), address(new MockInterchainTokenService()).code);
        vm.chainId(SEPOLIA_CHAIN_ID);

        bytes32 tokenId = keccak256("registered-token-id");
        address localToken = makeAddr("localToken");
        address recipient = 0xB00E8a2dE865080dd706F34642289aCa5E5958CA;
        uint256 amount = 10 ether;
        uint256 gasValue = 0.0001 ether;
        uint256 nativeFee = 0.001 ether;

        service.setRegisteredToken(tokenId, localToken);

        SendInterchainTransfer script = new SendInterchainTransfer();
        vm.deal(address(script), nativeFee);

        script.run(tokenId, "hedera", recipient, amount, gasValue, nativeFee);

        assertEq(service.lastTokenId(), tokenId);
        assertEq(service.lastDestinationChain(), "hedera");
        assertEq(service.lastDestinationAddress().length, 20);
        assertEq(service.lastDestinationAddress().toAddress(), recipient);
        assertEq(service.lastAmount(), amount);
        assertEq(service.lastMetadata().length, 0);
        assertEq(service.lastGasValue(), gasValue);
        assertEq(service.lastNativeFee(), nativeFee);
    }
}
