// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import { IHederaTokenService } from "./interfaces/IHederaTokenService.sol";

/// @title SubscriptionNFT
/// @notice Creates an HTS NFT collection and mints subscription NFTs with on-chain metadata.
contract SubscriptionNFT is Ownable {
    address public constant HTS = 0x0000000000000000000000000000000000000167;
    int64 public constant SUCCESS = 22;
    uint256 public constant SUPPLY_KEY = 16;
    uint256 public constant METADATA_MAX_BYTES = 100;

    struct SubscriptionData {
        address minter;
        string provider;
        string serviceTier;
        uint256 startDate;
        uint256 endDate;
    }

    /// @notice HTS NFT token address created via precompile.
    address public collectionAddress;

    mapping(int64 serialNumber => SubscriptionData data) private _subscriptions;
    mapping(int64 serialNumber => bool exists) private _subscriptionExists;

    event CollectionCreated(address indexed collectionAddress, string name, string symbol);
    event SubscriptionMinted(address indexed recipient, int64 indexed serialNumber, string provider, string serviceTier);

    error CollectionAlreadyCreated();
    error CollectionNotCreated();
    error InvalidDateRange();
    error EmptyField();
    error MetadataTooLong();
    error UnexpectedSerialCount(uint256 count);
    error SubscriptionNotFound(int64 serialNumber);
    error InvalidSerialNumber(int64 serialNumber);
    error HtsCreateFailed(int64 responseCode);
    error HtsMintFailed(int64 responseCode);
    error HtsTransferFailed(int64 responseCode);

    constructor(address initialOwner) Ownable(initialOwner) {}

    /// @notice Creates the HTS NFT collection once.
    /// @dev msg.value is forwarded to HTS precompile to cover creation fee.
    function createCollection(string calldata name, string calldata symbol, string calldata memo)
        external
        payable
        onlyOwner
        returns (address createdAddress)
    {
        if (collectionAddress != address(0)) revert CollectionAlreadyCreated();
        if (bytes(name).length == 0 || bytes(symbol).length == 0) revert EmptyField();

        IHederaTokenService.HederaToken memory token = IHederaTokenService.HederaToken({
            name: name,
            symbol: symbol,
            treasury: address(this),
            memo: memo,
            tokenSupplyType: false,
            maxSupply: 0,
            freezeDefault: false,
            tokenKeys: _defaultTokenKeys(),
            expiry: _defaultExpiry()
        });

        (int64 responseCode, address created) = IHederaTokenService(HTS).createNonFungibleToken{ value: msg.value }(token);
        if (responseCode != SUCCESS) revert HtsCreateFailed(responseCode);

        collectionAddress = created;
        emit CollectionCreated(created, name, symbol);
        return created;
    }

    /// @notice Mints a subscription NFT and transfers it to msg.sender.
    function mintSubscription(
        string calldata provider,
        string calldata serviceTier,
        uint256 startDate,
        uint256 endDate
    ) external returns (int64 serialNumber) {
        if (collectionAddress == address(0)) revert CollectionNotCreated();
        if (bytes(provider).length == 0 || bytes(serviceTier).length == 0) revert EmptyField();
        if (startDate >= endDate) revert InvalidDateRange();

        bytes memory label = bytes(string.concat(provider, " - ", serviceTier));
        if (label.length > METADATA_MAX_BYTES) revert MetadataTooLong();

        bytes[] memory metadata = new bytes[](1);
        metadata[0] = label;

        (int64 responseCode, , int64[] memory serialNumbers) =
            IHederaTokenService(HTS).mintToken(collectionAddress, 0, metadata);
        if (responseCode != SUCCESS) revert HtsMintFailed(responseCode);

        if (serialNumbers.length != 1) revert UnexpectedSerialCount(serialNumbers.length);

        int64 newSerial = serialNumbers[0];

        int64 transferResponse =
            IHederaTokenService(HTS).transferNFT(collectionAddress, address(this), msg.sender, newSerial);
        if (transferResponse != SUCCESS) revert HtsTransferFailed(transferResponse);

        _subscriptionExists[newSerial] = true;
        _subscriptions[newSerial] = SubscriptionData({
            minter: msg.sender,
            provider: provider,
            serviceTier: serviceTier,
            startDate: startDate,
            endDate: endDate
        });

        emit SubscriptionMinted(msg.sender, newSerial, provider, serviceTier);
        return newSerial;
    }

    function getSubscription(int64 serialNumber) external view returns (SubscriptionData memory) {
        if (!_subscriptionExists[serialNumber]) revert SubscriptionNotFound(serialNumber);
        return _subscriptions[serialNumber];
    }

    function getEndDate(int64 serialNumber) external view returns (uint256) {
        if (!_subscriptionExists[serialNumber]) revert SubscriptionNotFound(serialNumber);
        return _subscriptions[serialNumber].endDate;
    }

    function isExpired(int64 serialNumber) external view returns (bool) {
        if (!_subscriptionExists[serialNumber]) revert SubscriptionNotFound(serialNumber);
        return block.timestamp > _subscriptions[serialNumber].endDate;
    }

    /// @notice Returns the current HTS owner of the given NFT serial.
    /// @dev Uses the HTS ERC-721 compatibility surface on the collection address.
    function currentOwner(int64 serialNumber) external view returns (address) {
        if (!_subscriptionExists[serialNumber]) revert SubscriptionNotFound(serialNumber);
        if (serialNumber <= 0) revert InvalidSerialNumber(serialNumber);
        if (collectionAddress == address(0)) revert CollectionNotCreated();
        return IERC721(collectionAddress).ownerOf(uint256(uint64(serialNumber)));
    }

    function _defaultTokenKeys() internal view returns (IHederaTokenService.TokenKey[] memory) {
        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](1);
        keys[0] = IHederaTokenService.TokenKey({
            keyType: SUPPLY_KEY,
            key: IHederaTokenService.KeyValue({
                inheritAccountKey: false,
                contractId: address(this),
                ed25519: "",
                ECDSA_secp256k1: "",
                delegatableContractId: address(0)
            })
        });
        return keys;
    }

    function _defaultExpiry() internal view returns (IHederaTokenService.Expiry memory) {
        return IHederaTokenService.Expiry({ second: 0, autoRenewAccount: owner(), autoRenewPeriod: 7_890_000 });
    }

}
