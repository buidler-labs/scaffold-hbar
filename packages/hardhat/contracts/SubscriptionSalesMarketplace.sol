// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface ISalesSubscriptionNFT {
    struct SubscriptionData {
        address minter;
        address providerAddress;
        string provider;
        string serviceTier;
        uint256 startDate;
        uint256 endDate;
    }

    function getSubscription(int64 serialNumber) external view returns (SubscriptionData memory);
    function getProviderAddress(int64 serialNumber) external view returns (address);
    function isExpired(int64 serialNumber) external view returns (bool);
    function currentOwner(int64 serialNumber) external view returns (address);
    function collectionAddress() external view returns (address);
}

interface IRentalMarketplace {
    function hasActiveFutureBookings(int64 serialNumber) external view returns (bool);
}

/// @title SubscriptionSalesMarketplace
/// @notice Secondary marketplace for selling subscription NFTs via fixed-price or English auction.
/// @dev Supports provider royalties (5%) and marketplace fees (5%) on all sales.
contract SubscriptionSalesMarketplace is Ownable, ReentrancyGuard {
    /// @notice Basis points denominator for fee calculations.
    uint256 public constant BPS_DENOMINATOR = 10_000;
    /// @notice Fixed auction duration for all auctions.
    uint256 public constant AUCTION_DURATION = 3 days;
    /// @notice Provider royalty fee in basis points (5%).
    uint256 public constant PROVIDER_FEE_BPS = 500;
    /// @notice Minimum bid increment as percentage of current bid (1%).
    uint256 public constant MIN_BID_INCREMENT_BPS = 100;

    /// @notice Type of sale listing.
    enum ListingType {
        FixedPrice,
        Auction
    }

    /// @notice Lifecycle status of a listing.
    enum ListingStatus {
        Active,
        Sold,
        Cancelled
    }

    /// @notice Sale listing data.
    struct Listing {
        uint256 id;
        int64 serialNumber;
        address seller;
        ListingType listingType;
        ListingStatus status;
        uint256 price;
        uint256 effectiveStartDate;
        uint256 auctionEndTime;
        address highestBidder;
        uint256 highestBid;
    }

    /// @notice Subscription NFT contract.
    ISalesSubscriptionNFT public immutable subscriptionNFT;
    /// @notice Rental marketplace for booking checks.
    IRentalMarketplace public immutable rentalMarketplace;
    /// @notice Marketplace fee in basis points.
    uint16 public marketplaceFeeBps;
    /// @notice Fees accumulated and pending owner withdrawal.
    uint256 public accruedMarketplaceFees;

    /// @notice Next listing id to assign.
    uint256 public nextListingId = 1;

    /// @notice Mapping of listing id to listing details.
    mapping(uint256 listingId => Listing listing) public listings;
    /// @notice Mapping of serial number to active listing id (0 if none).
    mapping(int64 serialNumber => uint256 listingId) public activeListingBySerial;

    /// @notice Emitted when a fixed-price listing is created.
    event FixedPriceListingCreated(
        uint256 indexed listingId,
        int64 indexed serialNumber,
        address indexed seller,
        uint256 price,
        uint256 effectiveStartDate
    );
    /// @notice Emitted when an auction is created.
    event AuctionCreated(
        uint256 indexed listingId,
        int64 indexed serialNumber,
        address indexed seller,
        uint256 reservePrice,
        uint256 effectiveStartDate,
        uint256 auctionEndTime
    );
    /// @notice Emitted when a bid is placed on an auction.
    event BidPlaced(
        uint256 indexed listingId,
        address indexed bidder,
        uint256 amount,
        address previousBidder,
        uint256 previousBid
    );
    /// @notice Emitted when a listing is sold (fixed-price or auction settlement).
    event ListingSold(
        uint256 indexed listingId,
        int64 indexed serialNumber,
        address indexed buyer,
        address seller,
        uint256 salePrice,
        uint256 providerFee,
        uint256 marketplaceFee,
        uint256 sellerProceeds
    );
    /// @notice Emitted when a listing is cancelled.
    event ListingCancelled(uint256 indexed listingId, address indexed seller);
    /// @notice Emitted when marketplace fee basis points change.
    event MarketplaceFeeUpdated(uint16 oldFeeBps, uint16 newFeeBps);
    /// @notice Emitted when marketplace owner withdraws accrued fees.
    event MarketplaceFeesWithdrawn(address indexed recipient, uint256 amount);

    /// @notice Thrown when subscription NFT address is zero.
    error InvalidSubscriptionNFTAddress();
    /// @notice Thrown when rental marketplace address is zero.
    error InvalidRentalMarketplaceAddress();
    /// @notice Thrown when marketplace fee exceeds 100%.
    error InvalidFeeBps(uint256 feeBps);
    /// @notice Thrown when price is zero.
    error InvalidPrice();
    /// @notice Thrown when caller is not current NFT owner.
    error NotCurrentOwner(int64 serialNumber);
    /// @notice Thrown when subscription is expired.
    error SubscriptionExpired(int64 serialNumber);
    /// @notice Thrown when subscription has active future bookings.
    error HasActiveFutureBookings(int64 serialNumber);
    /// @notice Thrown when serial already has an active listing.
    error AlreadyListed(int64 serialNumber);
    /// @notice Thrown when listing does not exist.
    error ListingNotFound(uint256 listingId);
    /// @notice Thrown when listing is not active.
    error ListingNotActive(uint256 listingId);
    /// @notice Thrown when caller is not the seller.
    error NotSeller(uint256 listingId);
    /// @notice Thrown when attempting to buy an auction listing.
    error CannotBuyAuction();
    /// @notice Thrown when attempting to bid on fixed-price listing.
    error CannotBidOnFixedPrice();
    /// @notice Thrown when auction has ended.
    error AuctionEnded(uint256 listingId);
    /// @notice Thrown when auction has not ended yet.
    error AuctionNotEnded(uint256 listingId);
    /// @notice Thrown when bid is below minimum required.
    error BidTooLow(uint256 required, uint256 provided);
    /// @notice Thrown when payment does not match price.
    error IncorrectPayment(uint256 expected, uint256 received);
    /// @notice Thrown when auction has bids and cannot be cancelled.
    error AuctionHasBids(uint256 listingId);
    /// @notice Thrown when transfer fails.
    error TransferFailed();
    /// @notice Thrown when nothing to withdraw.
    error NothingToWithdraw();
    /// @notice Thrown when marketplace is not approved for NFT transfer.
    error NotApprovedForTransfer(int64 serialNumber);
    /// @notice Thrown when effective start date is invalid.
    error InvalidEffectiveStartDate(uint256 effectiveStartDate, uint256 minDate, uint256 maxDate);

    /// @notice Initializes the sales marketplace.
    /// @param initialOwner Account receiving Ownable privileges.
    /// @param subscriptionNFTAddress Subscription NFT contract address.
    /// @param rentalMarketplaceAddress Rental marketplace contract address.
    /// @param initialMarketplaceFeeBps Initial marketplace fee in basis points.
    constructor(
        address initialOwner,
        address subscriptionNFTAddress,
        address rentalMarketplaceAddress,
        uint16 initialMarketplaceFeeBps
    ) Ownable(initialOwner) {
        if (subscriptionNFTAddress == address(0)) revert InvalidSubscriptionNFTAddress();
        if (rentalMarketplaceAddress == address(0)) revert InvalidRentalMarketplaceAddress();
        if (initialMarketplaceFeeBps > BPS_DENOMINATOR) revert InvalidFeeBps(initialMarketplaceFeeBps);

        subscriptionNFT = ISalesSubscriptionNFT(subscriptionNFTAddress);
        rentalMarketplace = IRentalMarketplace(rentalMarketplaceAddress);
        marketplaceFeeBps = initialMarketplaceFeeBps;
    }

    /// @notice Updates marketplace fee basis points.
    /// @param newFeeBps New fee value in basis points.
    function setMarketplaceFeeBps(uint16 newFeeBps) external onlyOwner {
        if (newFeeBps > BPS_DENOMINATOR) revert InvalidFeeBps(newFeeBps);
        uint16 oldFee = marketplaceFeeBps;
        marketplaceFeeBps = newFeeBps;
        emit MarketplaceFeeUpdated(oldFee, newFeeBps);
    }

    /// @notice Creates a fixed-price listing for a subscription NFT.
    /// @param serialNumber Subscription serial to sell.
    /// @param askPrice Asking price in wei.
    /// @param effectiveStartDate Date from which buyer can use the subscription.
    /// @return listingId Newly created listing id.
    function createFixedPriceListing(int64 serialNumber, uint256 askPrice, uint256 effectiveStartDate)
        external
        returns (uint256 listingId)
    {
        _validateListingCreation(serialNumber);
        if (askPrice == 0) revert InvalidPrice();

        ISalesSubscriptionNFT.SubscriptionData memory sub = subscriptionNFT.getSubscription(serialNumber);
        _validateEffectiveStartDate(effectiveStartDate, sub.startDate, sub.endDate);

        listingId = nextListingId++;
        listings[listingId] = Listing({
            id: listingId,
            serialNumber: serialNumber,
            seller: msg.sender,
            listingType: ListingType.FixedPrice,
            status: ListingStatus.Active,
            price: askPrice,
            effectiveStartDate: effectiveStartDate,
            auctionEndTime: 0,
            highestBidder: address(0),
            highestBid: 0
        });
        activeListingBySerial[serialNumber] = listingId;

        emit FixedPriceListingCreated(listingId, serialNumber, msg.sender, askPrice, effectiveStartDate);
    }

    /// @notice Creates an auction listing for a subscription NFT.
    /// @param serialNumber Subscription serial to auction.
    /// @param reservePrice Minimum acceptable bid in wei.
    /// @param effectiveStartDate Date from which buyer can use the subscription.
    /// @return listingId Newly created listing id.
    function createAuction(int64 serialNumber, uint256 reservePrice, uint256 effectiveStartDate)
        external
        returns (uint256 listingId)
    {
        _validateListingCreation(serialNumber);
        if (reservePrice == 0) revert InvalidPrice();

        ISalesSubscriptionNFT.SubscriptionData memory sub = subscriptionNFT.getSubscription(serialNumber);
        _validateEffectiveStartDate(effectiveStartDate, sub.startDate, sub.endDate);

        uint256 auctionEndTime = block.timestamp + AUCTION_DURATION;

        listingId = nextListingId++;
        listings[listingId] = Listing({
            id: listingId,
            serialNumber: serialNumber,
            seller: msg.sender,
            listingType: ListingType.Auction,
            status: ListingStatus.Active,
            price: reservePrice,
            effectiveStartDate: effectiveStartDate,
            auctionEndTime: auctionEndTime,
            highestBidder: address(0),
            highestBid: 0
        });
        activeListingBySerial[serialNumber] = listingId;

        emit AuctionCreated(listingId, serialNumber, msg.sender, reservePrice, effectiveStartDate, auctionEndTime);
    }

    /// @notice Purchases a fixed-price listing.
    /// @param listingId Listing id to purchase.
    function buy(uint256 listingId) external payable nonReentrant {
        Listing storage listing = listings[listingId];
        if (listing.id == 0) revert ListingNotFound(listingId);
        if (listing.status != ListingStatus.Active) revert ListingNotActive(listingId);
        if (listing.listingType != ListingType.FixedPrice) revert CannotBuyAuction();
        if (msg.value != listing.price) revert IncorrectPayment(listing.price, msg.value);

        _executeSale(listingId, msg.sender, listing.price);
    }

    /// @notice Places a bid on an auction listing.
    /// @param listingId Listing id to bid on.
    function bid(uint256 listingId) external payable nonReentrant {
        Listing storage listing = listings[listingId];
        if (listing.id == 0) revert ListingNotFound(listingId);
        if (listing.status != ListingStatus.Active) revert ListingNotActive(listingId);
        if (listing.listingType != ListingType.Auction) revert CannotBidOnFixedPrice();
        if (block.timestamp >= listing.auctionEndTime) revert AuctionEnded(listingId);

        uint256 minimumBid = _getMinimumBid(listing);
        if (msg.value < minimumBid) revert BidTooLow(minimumBid, msg.value);

        address previousBidder = listing.highestBidder;
        uint256 previousBid = listing.highestBid;

        listing.highestBidder = msg.sender;
        listing.highestBid = msg.value;

        emit BidPlaced(listingId, msg.sender, msg.value, previousBidder, previousBid);

        if (previousBidder != address(0) && previousBid > 0) {
            (bool refunded, ) = payable(previousBidder).call{ value: previousBid }("");
            if (!refunded) revert TransferFailed();
        }
    }

    /// @notice Settles an ended auction, transferring NFT and distributing funds.
    /// @param listingId Listing id to settle.
    function settleAuction(uint256 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];
        if (listing.id == 0) revert ListingNotFound(listingId);
        if (listing.status != ListingStatus.Active) revert ListingNotActive(listingId);
        if (listing.listingType != ListingType.Auction) revert CannotBidOnFixedPrice();
        if (block.timestamp < listing.auctionEndTime) revert AuctionNotEnded(listingId);

        if (listing.highestBidder == address(0) || listing.highestBid < listing.price) {
            listing.status = ListingStatus.Cancelled;
            activeListingBySerial[listing.serialNumber] = 0;
            emit ListingCancelled(listingId, listing.seller);
            return;
        }

        _executeSale(listingId, listing.highestBidder, listing.highestBid);
    }

    /// @notice Cancels an active listing.
    /// @dev Fixed-price listings can be cancelled anytime. Auctions only if no bids.
    /// @param listingId Listing id to cancel.
    function cancelListing(uint256 listingId) external {
        Listing storage listing = listings[listingId];
        if (listing.id == 0) revert ListingNotFound(listingId);
        if (listing.status != ListingStatus.Active) revert ListingNotActive(listingId);
        if (listing.seller != msg.sender) revert NotSeller(listingId);

        if (listing.listingType == ListingType.Auction && listing.highestBidder != address(0)) {
            revert AuctionHasBids(listingId);
        }

        listing.status = ListingStatus.Cancelled;
        activeListingBySerial[listing.serialNumber] = 0;

        emit ListingCancelled(listingId, msg.sender);
    }

    /// @notice Withdraws all accrued marketplace fees.
    /// @param recipient Address receiving withdrawn fees.
    function withdrawMarketplaceFees(address payable recipient) external onlyOwner nonReentrant {
        uint256 amount = accruedMarketplaceFees;
        if (amount == 0) revert NothingToWithdraw();
        accruedMarketplaceFees = 0;

        (bool sent, ) = recipient.call{ value: amount }("");
        if (!sent) revert TransferFailed();

        emit MarketplaceFeesWithdrawn(recipient, amount);
    }

    /// @notice Returns the minimum bid required for an auction.
    /// @param listingId Listing id to check.
    /// @return minimumBid Minimum bid amount in wei.
    function getMinimumBid(uint256 listingId) external view returns (uint256) {
        Listing storage listing = listings[listingId];
        if (listing.id == 0) revert ListingNotFound(listingId);
        return _getMinimumBid(listing);
    }

    /// @notice Returns all listing details.
    /// @param listingId Listing id to query.
    /// @return Listing struct.
    function getListing(uint256 listingId) external view returns (Listing memory) {
        if (listings[listingId].id == 0) revert ListingNotFound(listingId);
        return listings[listingId];
    }

    /// @notice Checks if a serial number has an active sale listing.
    /// @param serialNumber Serial to check.
    /// @return hasListing True if active listing exists.
    function hasActiveListing(int64 serialNumber) external view returns (bool) {
        return activeListingBySerial[serialNumber] != 0;
    }

    /// @notice Validates effective start date for a listing.
    /// @param effectiveStartDate The proposed start date.
    /// @param subscriptionStartDate The subscription's original start date.
    /// @param subscriptionEndDate The subscription's end date.
    function _validateEffectiveStartDate(
        uint256 effectiveStartDate,
        uint256 subscriptionStartDate,
        uint256 subscriptionEndDate
    ) internal view {
        uint256 minDate = block.timestamp > subscriptionStartDate ? block.timestamp : subscriptionStartDate;
        if (effectiveStartDate < minDate || effectiveStartDate >= subscriptionEndDate) {
            revert InvalidEffectiveStartDate(effectiveStartDate, minDate, subscriptionEndDate);
        }
    }

    /// @notice Validates listing creation requirements.
    /// @param serialNumber Serial to validate.
    function _validateListingCreation(int64 serialNumber) internal view {
        address currentOwner = subscriptionNFT.currentOwner(serialNumber);
        if (currentOwner != msg.sender) revert NotCurrentOwner(serialNumber);

        if (subscriptionNFT.isExpired(serialNumber)) revert SubscriptionExpired(serialNumber);

        if (rentalMarketplace.hasActiveFutureBookings(serialNumber)) {
            revert HasActiveFutureBookings(serialNumber);
        }

        if (activeListingBySerial[serialNumber] != 0) revert AlreadyListed(serialNumber);

        address collectionAddr = subscriptionNFT.collectionAddress();
        if (!_isApprovedOrOwner(collectionAddr, msg.sender, uint256(uint64(serialNumber)))) {
            revert NotApprovedForTransfer(serialNumber);
        }
    }

    /// @notice Checks if this contract is approved for NFT transfer.
    /// @param collection NFT collection address.
    /// @param owner Current owner.
    /// @param tokenId Token id to check.
    /// @return approved True if approved.
    function _isApprovedOrOwner(address collection, address owner, uint256 tokenId) internal view returns (bool) {
        IERC721 nft = IERC721(collection);
        return nft.getApproved(tokenId) == address(this) || nft.isApprovedForAll(owner, address(this));
    }

    /// @notice Calculates minimum bid for an auction.
    /// @param listing Listing storage reference.
    /// @return minimumBid Minimum acceptable bid.
    function _getMinimumBid(Listing storage listing) internal view returns (uint256) {
        if (listing.highestBid == 0) {
            return listing.price;
        }
        uint256 increment = (listing.highestBid * MIN_BID_INCREMENT_BPS) / BPS_DENOMINATOR;
        if (increment == 0) increment = 1;
        return listing.highestBid + increment;
    }

    /// @notice Executes sale: transfers NFT and distributes payment.
    /// @param listingId Listing being sold.
    /// @param buyer Buyer address.
    /// @param salePrice Sale amount in wei.
    function _executeSale(uint256 listingId, address buyer, uint256 salePrice) internal {
        Listing storage listing = listings[listingId];
        int64 serialNumber = listing.serialNumber;
        address seller = listing.seller;

        address currentOwner = subscriptionNFT.currentOwner(serialNumber);
        if (currentOwner != seller) revert NotCurrentOwner(serialNumber);

        uint256 providerFee = (salePrice * PROVIDER_FEE_BPS) / BPS_DENOMINATOR;
        uint256 marketplaceFee = (salePrice * marketplaceFeeBps) / BPS_DENOMINATOR;
        uint256 sellerProceeds = salePrice - providerFee - marketplaceFee;

        listing.status = ListingStatus.Sold;
        activeListingBySerial[serialNumber] = 0;

        address collectionAddr = subscriptionNFT.collectionAddress();
        IERC721(collectionAddr).transferFrom(seller, buyer, uint256(uint64(serialNumber)));

        accruedMarketplaceFees += marketplaceFee;

        address providerAddress = subscriptionNFT.getProviderAddress(serialNumber);
        if (providerFee > 0 && providerAddress != address(0)) {
            (bool providerPaid, ) = payable(providerAddress).call{ value: providerFee }("");
            if (!providerPaid) revert TransferFailed();
        }

        if (sellerProceeds > 0) {
            (bool sellerPaid, ) = payable(seller).call{ value: sellerProceeds }("");
            if (!sellerPaid) revert TransferFailed();
        }

        emit ListingSold(
            listingId,
            serialNumber,
            buyer,
            seller,
            salePrice,
            providerFee,
            marketplaceFee,
            sellerProceeds
        );
    }
}
