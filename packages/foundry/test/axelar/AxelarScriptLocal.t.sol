// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { AddressBytes } from "@axelar-network/axelar-gmp-sdk-solidity/contracts/libs/AddressBytes.sol";
import { ITokenManagerType } from "interchain-token-service/contracts/interfaces/ITokenManagerType.sol";
import { htsSetup } from "hedera-forking/htsSetup.sol";
import { IERC20 as HtsIERC20 } from "hedera-forking/IERC20.sol";

import { MyBridgeHtsToken } from "../../contracts/axelar/MyBridgeHtsToken.sol";
import { HelperConfig, NetworkConfig } from "../../script/axelar/HelperConfig.s.sol";
import { LinkRemoteToken } from "../../script/axelar/LinkRemoteToken.s.sol";
import { MintInterchainToken } from "../../script/axelar/MintInterchainToken.s.sol";
import { RegisterTokenMetadata } from "../../script/axelar/RegisterTokenMetadata.s.sol";
import { SendInterchainTransfer } from "../../script/axelar/SendInterchainTransfer.s.sol";

contract MockInterchainTokenFactory {
    bytes32 public constant RETURN_TOKEN_ID = keccak256("mock-token-id");

    bytes32 public lastSalt;
    string public lastDestinationChain;
    bytes public lastDestinationTokenAddress;
    ITokenManagerType.TokenManagerType public lastTokenManagerType;
    bytes public lastLinkParams;
    uint256 public lastGasValue;
    uint256 public lastNativeFee;

    function linkToken(
        bytes32 salt,
        string calldata destinationChain,
        bytes calldata destinationTokenAddress,
        ITokenManagerType.TokenManagerType tokenManagerType,
        bytes calldata linkParams,
        uint256 gasValue
    ) external payable returns (bytes32 tokenId) {
        require(destinationTokenAddress.length == 20, "destination token must be 20 bytes");

        lastSalt = salt;
        lastDestinationChain = destinationChain;
        lastDestinationTokenAddress = destinationTokenAddress;
        lastTokenManagerType = tokenManagerType;
        lastLinkParams = linkParams;
        lastGasValue = gasValue;
        lastNativeFee = msg.value;

        return RETURN_TOKEN_ID;
    }
}

contract MockInterchainTokenService {
    bytes32 public lastTokenId;
    string public lastDestinationChain;
    bytes public lastDestinationAddress;
    uint256 public lastAmount;
    bytes public lastMetadata;
    uint256 public lastGasValue;
    uint256 public lastNativeFee;
    address public lastMetadataToken;
    uint256 public lastMetadataGasValue;
    uint256 public lastMetadataNativeFee;
    uint8 public lastMetadataDecimals;

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

    function registerTokenMetadata(address tokenAddress, uint256 gasValue) external payable {
        lastMetadataToken = tokenAddress;
        lastMetadataGasValue = gasValue;
        lastMetadataNativeFee = msg.value;
        lastMetadataDecimals = HtsIERC20(tokenAddress).decimals();
    }
}

contract MockTokenManager {
    address public lastTokenAddress;
    address public lastRecipient;
    uint256 public lastAmount;

    function mintToken(address tokenAddress, address recipient, uint256 amount) external {
        lastTokenAddress = tokenAddress;
        lastRecipient = recipient;
        lastAmount = amount;
    }
}

contract AxelarScriptLocalTest is Test {
    using AddressBytes for bytes;

    uint256 internal constant HEDERA_CHAIN_ID = 296;
    uint256 internal constant SEPOLIA_CHAIN_ID = 11_155_111;

    HelperConfig internal helper;
    MockInterchainTokenFactory internal factory;
    MockInterchainTokenService internal service;

    function setUp() public {
        helper = new HelperConfig();
    }

    function test_linkRemoteToken_encodesDestinationTokenAsTwentyByteAddress() public {
        NetworkConfig memory config = helper.getConfigByChainId(SEPOLIA_CHAIN_ID);
        factory = MockInterchainTokenFactory(config.interchainTokenFactory);
        vm.etch(address(factory), address(new MockInterchainTokenFactory()).code);
        vm.chainId(SEPOLIA_CHAIN_ID);

        bytes32 salt = keccak256("factory-salt");
        address hederaToken = 0x00000000000000000000000000000000008658Ed;
        uint256 gasValue = 0.0001 ether;
        uint256 nativeFee = 0.001 ether;

        LinkRemoteToken script = new LinkRemoteToken();
        vm.deal(address(script), nativeFee);

        script.run(
            salt, "hedera", hederaToken, ITokenManagerType.TokenManagerType.LOCK_UNLOCK, hex"", gasValue, nativeFee
        );

        assertEq(factory.lastSalt(), salt);
        assertEq(factory.lastDestinationChain(), "hedera");
        assertEq(factory.lastDestinationTokenAddress().length, 20);
        assertEq(factory.lastDestinationTokenAddress().toAddress(), hederaToken);
        assertEq(uint8(factory.lastTokenManagerType()), uint8(ITokenManagerType.TokenManagerType.LOCK_UNLOCK));
        assertEq(factory.lastGasValue(), gasValue);
        assertEq(factory.lastNativeFee(), nativeFee);
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

    function test_mintInterchainToken_callsTokenManagerMint() public {
        MockTokenManager tokenManager = new MockTokenManager();
        address tokenAddress = makeAddr("itsToken");
        address recipient = makeAddr("recipient");
        uint256 amount = 123 ether;

        new MintInterchainToken().run(address(tokenManager), tokenAddress, recipient, amount);

        assertEq(tokenManager.lastTokenAddress(), tokenAddress);
        assertEq(tokenManager.lastRecipient(), recipient);
        assertEq(tokenManager.lastAmount(), amount);
    }

    function test_hederaMetadata_usesGasValueZeroAndReadsHtsDecimals() public {
        htsSetup();

        NetworkConfig memory config = helper.getConfigByChainId(HEDERA_CHAIN_ID);
        service = MockInterchainTokenService(config.interchainTokenService);
        vm.etch(address(service), address(new MockInterchainTokenService()).code);
        vm.chainId(HEDERA_CHAIN_ID);

        MyBridgeHtsToken wrapper = new MyBridgeHtsToken{ value: 15 ether }("BridgeToken", "BTK", address(this), 0);
        address htsToken = wrapper.token();

        new RegisterTokenMetadata().run(htsToken, 0, 0);

        assertEq(service.lastMetadataToken(), htsToken);
        assertEq(service.lastMetadataGasValue(), 0);
        assertEq(service.lastMetadataNativeFee(), 0);
        assertEq(service.lastMetadataDecimals(), 18);
    }

    function test_myBridgeHtsToken_mintsInitialSupplyAndOwnerCanMintMore() public {
        htsSetup();

        int64 initialSupply = 1e18;
        int64 extraSupply = 2e18;

        MyBridgeHtsToken wrapper =
            new MyBridgeHtsToken{ value: 15 ether }("BridgeToken", "BTK", address(this), initialSupply);
        address htsToken = wrapper.token();

        assertEq(HtsIERC20(htsToken).balanceOf(address(this)), uint64(initialSupply));

        wrapper.mintTo(address(this), extraSupply);

        assertEq(HtsIERC20(htsToken).balanceOf(address(this)), uint64(initialSupply + extraSupply));
    }
}
