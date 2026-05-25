// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { IHederaTokenService } from "../interfaces/IHederaTokenService.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/// @title MockHTS
/// @notice Mock implementation of Hedera Token Service for local testing.
/// @dev Addresses the limitation in @hashgraph/system-contracts-forking v0.1.2
///      where NFT minting (amount=0, metadata array) is not supported.
contract MockHTS is IHederaTokenService {
    int64 public constant SUCCESS = 22;

    mapping(address token => TokenData data) private _tokens;
    mapping(address token => mapping(int64 serial => address owner)) private _nftOwners;
    mapping(address token => mapping(address owner => mapping(address spender => bool))) private _operatorApprovals;
    
    uint256 private _tokenCounter;

    struct TokenData {
        bool exists;
        bool isNFT;
        string name;
        string symbol;
        address treasury;
        int64 totalSupply;
        int64 nextSerial;
        address supplyKey;
    }

    event TokenCreated(address indexed token, string name, string symbol, bool isNFT);
    event NFTMinted(address indexed token, int64 serialNumber, address indexed treasury);
    event NFTTransferred(address indexed token, int64 serialNumber, address indexed from, address indexed to);

    function createNonFungibleToken(HederaToken memory token)
        external
        payable
        override
        returns (int64 responseCode, address tokenAddress)
    {
        _tokenCounter++;
        
        address supplyKeyAddr = address(0);
        for (uint256 i = 0; i < token.tokenKeys.length; i++) {
            if (token.tokenKeys[i].keyType == 16) {
                supplyKeyAddr = token.tokenKeys[i].key.contractId;
                break;
            }
        }

        // Deploy an ERC721-compatible proxy for this NFT collection
        MockNFTProxy proxy = new MockNFTProxy(this, token.name, token.symbol);
        tokenAddress = address(proxy);

        _tokens[tokenAddress] = TokenData({
            exists: true,
            isNFT: true,
            name: token.name,
            symbol: token.symbol,
            treasury: token.treasury,
            totalSupply: 0,
            nextSerial: 1,
            supplyKey: supplyKeyAddr
        });

        emit TokenCreated(tokenAddress, token.name, token.symbol, true);
        return (SUCCESS, tokenAddress);
    }

    function createFungibleToken(
        HederaToken memory token,
        int64 initialTotalSupply,
        int32 /* decimals */
    ) external payable override returns (int64 responseCode, address tokenAddress) {
        _tokenCounter++;
        tokenAddress = address(uint160(_tokenCounter + 0x1000));
        
        _tokens[tokenAddress] = TokenData({
            exists: true,
            isNFT: false,
            name: token.name,
            symbol: token.symbol,
            treasury: token.treasury,
            totalSupply: initialTotalSupply,
            nextSerial: 0,
            supplyKey: address(0)
        });

        emit TokenCreated(tokenAddress, token.name, token.symbol, false);
        return (SUCCESS, tokenAddress);
    }

    function mintToken(
        address token,
        int64 amount,
        bytes[] memory metadata
    ) external override returns (int64 responseCode, int64 newTotalSupply, int64[] memory serialNumbers) {
        TokenData storage tokenData = _tokens[token];
        require(tokenData.exists, "MockHTS: token does not exist");

        if (tokenData.isNFT) {
            require(amount == 0, "MockHTS: amount must be 0 for NFT minting");
            require(metadata.length > 0, "MockHTS: metadata required for NFT minting");

            serialNumbers = new int64[](metadata.length);
            for (uint256 i = 0; i < metadata.length; i++) {
                int64 serial = tokenData.nextSerial;
                tokenData.nextSerial++;
                tokenData.totalSupply++;
                
                _nftOwners[token][serial] = tokenData.treasury;
                serialNumbers[i] = serial;
                
                emit NFTMinted(token, serial, tokenData.treasury);
            }
            
            newTotalSupply = tokenData.totalSupply;
        } else {
            require(amount > 0, "MockHTS: amount must be > 0 for fungible minting");
            tokenData.totalSupply += amount;
            newTotalSupply = tokenData.totalSupply;
            serialNumbers = new int64[](0);
        }

        return (SUCCESS, newTotalSupply, serialNumbers);
    }

    function transferNFT(
        address token,
        address sender,
        address receiver,
        int64 serialNumber
    ) external override returns (int64 responseCode) {
        TokenData storage tokenData = _tokens[token];
        require(tokenData.exists, "MockHTS: token does not exist");
        require(tokenData.isNFT, "MockHTS: not an NFT token");
        require(_nftOwners[token][serialNumber] == sender, "MockHTS: sender is not owner");

        _nftOwners[token][serialNumber] = receiver;
        
        emit NFTTransferred(token, serialNumber, sender, receiver);
        return SUCCESS;
    }

    function associateToken(address /* account */, address /* token */) external pure override returns (int64 responseCode) {
        return SUCCESS;
    }

    function dissociateToken(address /* account */, address /* token */) external pure override returns (int64 responseCode) {
        return SUCCESS;
    }

    function ownerOf(address token, int64 serialNumber) external view returns (address) {
        return _nftOwners[token][serialNumber];
    }

    function getTokenData(address token) external view returns (TokenData memory) {
        return _tokens[token];
    }
}

/// @title MockNFTProxy
/// @notice Minimal ERC-721 proxy for mock NFT tokens to support ownerOf, transferFrom, and approvals.
contract MockNFTProxy is IERC721 {
    MockHTS public immutable hts;
    string private _name;
    string private _symbol;

    mapping(uint256 tokenId => address approved) private _tokenApprovals;
    mapping(address owner => mapping(address operator => bool)) private _operatorApprovals;

    constructor(MockHTS _hts, string memory name_, string memory symbol_) {
        hts = _hts;
        _name = name_;
        _symbol = symbol_;
    }

    function name() external view returns (string memory) {
        return _name;
    }

    function symbol() external view returns (string memory) {
        return _symbol;
    }

    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return interfaceId == type(IERC721).interfaceId || interfaceId == type(IERC165).interfaceId;
    }

    function balanceOf(address /* owner */) external pure override returns (uint256) {
        return 0;
    }

    function ownerOf(uint256 tokenId) external view override returns (address) {
        return hts.ownerOf(address(this), int64(uint64(tokenId)));
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata /* data */) external override {
        _transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external override {
        _transfer(from, to, tokenId);
    }

    function transferFrom(address from, address to, uint256 tokenId) external override {
        address owner = hts.ownerOf(address(this), int64(uint64(tokenId)));
        require(
            msg.sender == owner || 
            _tokenApprovals[tokenId] == msg.sender || 
            _operatorApprovals[owner][msg.sender],
            "MockNFTProxy: not authorized"
        );
        _transfer(from, to, tokenId);
    }

    function _transfer(address from, address to, uint256 tokenId) internal {
        hts.transferNFT(address(this), from, to, int64(uint64(tokenId)));
        delete _tokenApprovals[tokenId];
    }

    function approve(address to, uint256 tokenId) external override {
        address owner = hts.ownerOf(address(this), int64(uint64(tokenId)));
        require(msg.sender == owner || _operatorApprovals[owner][msg.sender], "MockNFTProxy: not owner or operator");
        _tokenApprovals[tokenId] = to;
        emit Approval(owner, to, tokenId);
    }

    function setApprovalForAll(address operator, bool approved) external override {
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function getApproved(uint256 tokenId) external view override returns (address) {
        return _tokenApprovals[tokenId];
    }

    function isApprovedForAll(address owner, address operator) external view override returns (bool) {
        return _operatorApprovals[owner][operator];
    }
}
