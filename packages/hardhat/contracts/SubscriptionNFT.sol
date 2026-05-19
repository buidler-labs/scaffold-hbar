// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import { IHederaTokenService } from "./interfaces/IHederaTokenService.sol";

/// @title SubscriptionNFT
/// @notice Creates an HTS NFT collection and mints subscription NFTs with on-chain metadata.
contract SubscriptionNFT is Ownable {
    /// @notice Default Hedera Token Service precompile address.
    address public constant DEFAULT_HTS = 0x0000000000000000000000000000000000000167;
    /// @notice Configured HTS address (allows mock injection for testing).
    address public immutable HTS;
    /// @notice Hedera success response code.
    int64 public constant SUCCESS = 22;
    /// @notice Bitmask for the supply key in HTS token key definitions.
    uint256 public constant SUPPLY_KEY = 16;
    /// @notice Maximum serialized metadata size accepted by this template.
    uint256 public constant METADATA_MAX_BYTES = 100;

    /// @notice On-chain metadata tracked per subscription NFT serial.
    struct SubscriptionData {
        /// @notice Account that originally minted the subscription NFT.
        address minter;
        /// @notice Human-readable provider label (for example, "Gym A").
        string provider;
        /// @notice Human-readable plan/tier label (for example, "Premium").
        string serviceTier;
        /// @notice Subscription start timestamp (inclusive, Unix seconds).
        uint256 startDate;
        /// @notice Subscription end timestamp (exclusive, Unix seconds).
        uint256 endDate;
    }

    /// @notice HTS NFT token address created via precompile.
    address public collectionAddress;

    mapping(int64 serialNumber => SubscriptionData data) private _subscriptions;
    mapping(int64 serialNumber => bool exists) private _subscriptionExists;

    /// @notice Emitted when the HTS collection is created.
    /// @param collectionAddress Address of the newly created HTS NFT collection.
    /// @param name Token name used for collection creation.
    /// @param symbol Token symbol used for collection creation.
    event CollectionCreated(address indexed collectionAddress, string name, string symbol);
    /// @notice Emitted when a new subscription NFT is minted and transferred to recipient.
    /// @param recipient Account receiving the minted NFT serial.
    /// @param serialNumber HTS serial number returned by mint.
    /// @param provider Provider metadata stored for the serial.
    /// @param serviceTier Service tier metadata stored for the serial.
    event SubscriptionMinted(address indexed recipient, int64 indexed serialNumber, string provider, string serviceTier);

    /// @notice Thrown when collection creation is attempted more than once.
    error CollectionAlreadyCreated();
    /// @notice Thrown when an operation requires a collection before it is created.
    error CollectionNotCreated();
    /// @notice Thrown when provided start/end timestamps do not form a valid half-open range.
    error InvalidDateRange();
    /// @notice Thrown when a required string input is empty.
    error EmptyField();
    /// @notice Thrown when composed metadata exceeds the configured byte limit.
    error MetadataTooLong();
    /// @notice Thrown when HTS mint returns an unexpected number of serials.
    /// @param count Number of serials returned by HTS.
    error UnexpectedSerialCount(uint256 count);
    /// @notice Thrown when a serial has no corresponding stored metadata.
    /// @param serialNumber Missing serial identifier.
    error SubscriptionNotFound(int64 serialNumber);
    /// @notice Thrown when serial number is invalid for owner lookup.
    /// @param serialNumber Invalid serial identifier.
    error InvalidSerialNumber(int64 serialNumber);
    /// @notice Thrown when HTS collection creation fails.
    /// @param responseCode HTS response code.
    error HtsCreateFailed(int64 responseCode);
    /// @notice Thrown when HTS mint fails.
    /// @param responseCode HTS response code.
    error HtsMintFailed(int64 responseCode);
    /// @notice Thrown when HTS NFT transfer fails.
    /// @param responseCode HTS response code.
    error HtsTransferFailed(int64 responseCode);

    /// @notice Initializes the contract owner and HTS address.
    /// @param initialOwner Account that receives Ownable privileges.
    /// @param htsAddress HTS precompile address (use address(0) for default).
    constructor(address initialOwner, address htsAddress) Ownable(initialOwner) {
        HTS = htsAddress == address(0) ? DEFAULT_HTS : htsAddress;
    }

    /// @notice Creates the HTS NFT collection once.
    /// @dev msg.value is forwarded to HTS precompile to cover creation fee.
    /// @param name Name for the HTS NFT collection.
    /// @param symbol Symbol for the HTS NFT collection.
    /// @param memo Memo persisted on the HTS token.
    /// @return createdAddress Address of the created HTS token.
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

    /// @notice Mints a subscription NFT and transfers it to caller.
    /// @dev Caller must associate the HTS token before receiving the minted serial.
    /// @param provider Provider metadata to persist on-chain.
    /// @param serviceTier Tier metadata to persist on-chain.
    /// @param startDate Subscription start timestamp (inclusive, Unix seconds).
    /// @param endDate Subscription end timestamp (exclusive, Unix seconds).
    /// @return serialNumber Newly minted HTS serial number.
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

    /// @notice Returns stored subscription metadata for a serial.
    /// @param serialNumber Target serial number.
    /// @return data Subscription metadata struct for the serial.
    function getSubscription(int64 serialNumber) external view returns (SubscriptionData memory) {
        if (!_subscriptionExists[serialNumber]) revert SubscriptionNotFound(serialNumber);
        return _subscriptions[serialNumber];
    }

    /// @notice Returns the configured subscription end timestamp for a serial.
    /// @param serialNumber Target serial number.
    /// @return endDate Subscription end timestamp (exclusive, Unix seconds).
    function getEndDate(int64 serialNumber) external view returns (uint256) {
        if (!_subscriptionExists[serialNumber]) revert SubscriptionNotFound(serialNumber);
        return _subscriptions[serialNumber].endDate;
    }

    /// @notice Checks whether a subscription serial is expired at the current block timestamp.
    /// @param serialNumber Target serial number.
    /// @return isExpiredNow True when `block.timestamp` is strictly greater than `endDate`.
    function isExpired(int64 serialNumber) external view returns (bool) {
        if (!_subscriptionExists[serialNumber]) revert SubscriptionNotFound(serialNumber);
        return block.timestamp > _subscriptions[serialNumber].endDate;
    }

    /// @notice Returns the current HTS owner of the given NFT serial.
    /// @dev Uses the HTS ERC-721 compatibility surface on the collection address.
    /// @param serialNumber Target serial number.
    /// @return owner Current owner account according to `ownerOf`.
    function currentOwner(int64 serialNumber) external view returns (address) {
        if (!_subscriptionExists[serialNumber]) revert SubscriptionNotFound(serialNumber);
        if (serialNumber <= 0) revert InvalidSerialNumber(serialNumber);
        if (collectionAddress == address(0)) revert CollectionNotCreated();
        return IERC721(collectionAddress).ownerOf(uint256(uint64(serialNumber)));
    }

    /// @notice Builds default token key configuration for collection creation.
    /// @dev Sets this contract as supply key holder so it can mint serials.
    /// @return keys One-element key list containing the supply key.
    function _defaultTokenKeys() internal view returns (IHederaTokenService.TokenKey[] memory) {
        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](1);
        keys[0] = IHederaTokenService.TokenKey({
            keyType: SUPPLY_KEY,
            key: IHederaTokenService.KeyValue({
                inheritAccountKey: false,
                contractId: address(0),
                ed25519: "",
                ECDSA_secp256k1: "",
                delegatableContractId: address(this)
            })
        });
        return keys;
    }

    /// @notice Builds default token expiry configuration for collection creation.
    /// @dev Uses contract address as autoRenewAccount so delegatableContractId authorization covers it.
    /// @return Expiry object passed to HTS create token call.
    function _defaultExpiry() internal view returns (IHederaTokenService.Expiry memory) {
        return IHederaTokenService.Expiry({ second: 0, autoRenewAccount: address(this), autoRenewPeriod: 7_890_000 });
    }

}
