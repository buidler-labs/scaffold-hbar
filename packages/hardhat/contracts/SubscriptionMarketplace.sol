// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ISubscriptionNFT {
    struct SubscriptionData {
        address minter;
        string provider;
        string serviceTier;
        uint256 startDate;
        uint256 endDate;
    }

    function getSubscription(int64 serialNumber) external view returns (SubscriptionData memory);
    function getEndDate(int64 serialNumber) external view returns (uint256);
    function isExpired(int64 serialNumber) external view returns (bool);
    function currentOwner(int64 serialNumber) external view returns (address);
}

/// @title SubscriptionMarketplace
/// @notice Fixed-price booking registry for subscription NFTs.
/// @dev Booking windows are day-aligned and represented as half-open ranges: [startDate, endDate).
contract SubscriptionMarketplace is Ownable, ReentrancyGuard {
    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant DAY = 1 days;

    enum AvailabilityStatus {
        Active,
        Removed
    }

    enum BookingStatus {
        Active,
        Cancelled
    }

    struct AvailabilityWindow {
        uint256 id;
        address owner;
        int64 serialNumber;
        uint256 windowStart;
        uint256 windowEnd; // exclusive
        uint256 pricePerDay;
        AvailabilityStatus status;
    }

    struct Booking {
        uint256 id;
        address renter;
        uint256 availabilityId;
        int64 serialNumber;
        uint256 startDate;
        uint256 endDate; // exclusive
        uint256 totalPaid;
        BookingStatus status;
    }

    ISubscriptionNFT public immutable subscriptionNFT;
    uint16 public marketplaceFeeBps;
    uint256 public accruedMarketplaceFees;

    uint256 public nextAvailabilityId = 1;
    uint256 public nextBookingId = 1;

    mapping(uint256 availabilityId => AvailabilityWindow availability) public availabilities;
    mapping(uint256 bookingId => Booking booking) public bookingsById;
    mapping(int64 serialNumber => uint256[] bookingIds) private _bookingIdsBySerial;
    mapping(int64 serialNumber => uint256[] availabilityIds) private _availabilityIdsBySerial;

    event AvailabilityCreated(
        uint256 indexed availabilityId,
        int64 indexed serialNumber,
        address indexed owner,
        uint256 windowStart,
        uint256 windowEnd,
        uint256 pricePerDay
    );
    event AvailabilityPriceUpdated(uint256 indexed availabilityId, uint256 oldPricePerDay, uint256 newPricePerDay);
    event AvailabilityRemoved(uint256 indexed availabilityId);
    event Booked(
        uint256 indexed bookingId,
        uint256 indexed availabilityId,
        int64 indexed serialNumber,
        address renter,
        uint256 startDate,
        uint256 endDate,
        uint256 totalPaid
    );
    event BookingCancelled(uint256 indexed bookingId, address indexed renter, uint256 refundedAmount);
    event MarketplaceFeeUpdated(uint16 oldFeeBps, uint16 newFeeBps);
    event MarketplaceFeesWithdrawn(address indexed recipient, uint256 amount);

    error InvalidFeeBps(uint256 feeBps);
    error InvalidDateRange();
    error DateNotDayAligned();
    error InvalidPrice();
    error InvalidNumberOfDays();
    error AvailabilityNotFound(uint256 availabilityId);
    error BookingNotFound(uint256 bookingId);
    error AvailabilityInactive(uint256 availabilityId);
    error NotAvailabilityOwner();
    error NotBookingRenter();
    error BookingAlreadyStarted();
    error SubscriptionExpired(int64 serialNumber);
    error UnauthorizedSubscriptionOwner(int64 serialNumber);
    error AvailabilityOutOfSubscriptionBounds();
    error BookingOutOfAvailabilityBounds();
    error OverlappingAvailability();
    error OverlappingBooking();
    error IncorrectPayment(uint256 expected, uint256 received);
    error FeeTransferFailed();
    error OwnerPayoutFailed();
    error NothingToWithdraw();

    constructor(address initialOwner, address subscriptionNFTAddress, uint16 initialMarketplaceFeeBps) Ownable(initialOwner) {
        if (subscriptionNFTAddress == address(0)) revert InvalidPrice();
        if (initialMarketplaceFeeBps > BPS_DENOMINATOR) revert InvalidFeeBps(initialMarketplaceFeeBps);

        subscriptionNFT = ISubscriptionNFT(subscriptionNFTAddress);
        marketplaceFeeBps = initialMarketplaceFeeBps;
    }

    function setMarketplaceFeeBps(uint16 newFeeBps) external onlyOwner {
        if (newFeeBps > BPS_DENOMINATOR) revert InvalidFeeBps(newFeeBps);
        uint16 oldFee = marketplaceFeeBps;
        marketplaceFeeBps = newFeeBps;
        emit MarketplaceFeeUpdated(oldFee, newFeeBps);
    }

    function createAvailability(int64 serialNumber, uint256 windowStart, uint256 windowEnd, uint256 pricePerDay)
        external
        returns (uint256 availabilityId)
    {
        if (pricePerDay == 0) revert InvalidPrice();
        _requireDayAligned(windowStart);
        _requireDayAligned(windowEnd);
        if (windowStart >= windowEnd) revert InvalidDateRange();

        ISubscriptionNFT.SubscriptionData memory subscription = subscriptionNFT.getSubscription(serialNumber);
        address currentOwner = subscriptionNFT.currentOwner(serialNumber);
        if (currentOwner != msg.sender) revert UnauthorizedSubscriptionOwner(serialNumber);
        if (subscriptionNFT.isExpired(serialNumber)) revert SubscriptionExpired(serialNumber);
        if (windowStart < subscription.startDate || windowEnd > subscription.endDate) {
            revert AvailabilityOutOfSubscriptionBounds();
        }

        _ensureNoAvailabilityOverlap(serialNumber, windowStart, windowEnd);

        availabilityId = nextAvailabilityId++;
        availabilities[availabilityId] = AvailabilityWindow({
            id: availabilityId,
            owner: msg.sender,
            serialNumber: serialNumber,
            windowStart: windowStart,
            windowEnd: windowEnd,
            pricePerDay: pricePerDay,
            status: AvailabilityStatus.Active
        });
        _availabilityIdsBySerial[serialNumber].push(availabilityId);

        emit AvailabilityCreated(availabilityId, serialNumber, msg.sender, windowStart, windowEnd, pricePerDay);
    }

    function updateAvailability(uint256 availabilityId, uint256 newPricePerDay) external {
        if (newPricePerDay == 0) revert InvalidPrice();

        AvailabilityWindow storage availability = availabilities[availabilityId];
        if (availability.id == 0) revert AvailabilityNotFound(availabilityId);
        if (availability.status != AvailabilityStatus.Active) revert AvailabilityInactive(availabilityId);
        if (availability.owner != msg.sender) revert NotAvailabilityOwner();

        uint256 oldPrice = availability.pricePerDay;
        availability.pricePerDay = newPricePerDay;
        emit AvailabilityPriceUpdated(availabilityId, oldPrice, newPricePerDay);
    }

    function removeAvailability(uint256 availabilityId) external {
        AvailabilityWindow storage availability = availabilities[availabilityId];
        if (availability.id == 0) revert AvailabilityNotFound(availabilityId);
        if (availability.status != AvailabilityStatus.Active) revert AvailabilityInactive(availabilityId);
        if (availability.owner != msg.sender) revert NotAvailabilityOwner();

        uint256[] storage bookingIds = _bookingIdsBySerial[availability.serialNumber];
        uint256 len = bookingIds.length;
        for (uint256 i = 0; i < len; i++) {
            Booking storage booking = bookingsById[bookingIds[i]];
            if (booking.status != BookingStatus.Active) continue;
            if (_rangesOverlap(availability.windowStart, availability.windowEnd, booking.startDate, booking.endDate)) {
                revert OverlappingBooking();
            }
        }

        availability.status = AvailabilityStatus.Removed;
        emit AvailabilityRemoved(availabilityId);
    }

    function book(uint256 availabilityId, uint256 startDate, uint256 numberOfDays)
        external
        payable
        nonReentrant
        returns (uint256 bookingId)
    {
        if (numberOfDays == 0) revert InvalidNumberOfDays();
        _requireDayAligned(startDate);

        AvailabilityWindow storage availability = availabilities[availabilityId];
        if (availability.id == 0) revert AvailabilityNotFound(availabilityId);
        if (availability.status != AvailabilityStatus.Active) revert AvailabilityInactive(availabilityId);

        uint256 endDate = startDate + (numberOfDays * DAY);
        if (startDate >= endDate) revert InvalidDateRange();
        if (startDate < availability.windowStart || endDate > availability.windowEnd) {
            revert BookingOutOfAvailabilityBounds();
        }

        uint256[] storage bookingIds = _bookingIdsBySerial[availability.serialNumber];
        uint256 len = bookingIds.length;
        for (uint256 i = 0; i < len; i++) {
            Booking storage existing = bookingsById[bookingIds[i]];
            if (existing.status != BookingStatus.Active) continue;
            if (_rangesOverlap(startDate, endDate, existing.startDate, existing.endDate)) {
                revert OverlappingBooking();
            }
        }

        uint256 expectedPayment = availability.pricePerDay * numberOfDays;
        if (msg.value != expectedPayment) revert IncorrectPayment(expectedPayment, msg.value);

        uint256 feeAmount = (msg.value * marketplaceFeeBps) / BPS_DENOMINATOR;
        uint256 ownerPayout = msg.value - feeAmount;
        accruedMarketplaceFees += feeAmount;

        bookingId = nextBookingId++;
        bookingsById[bookingId] = Booking({
            id: bookingId,
            renter: msg.sender,
            availabilityId: availabilityId,
            serialNumber: availability.serialNumber,
            startDate: startDate,
            endDate: endDate,
            totalPaid: msg.value,
            status: BookingStatus.Active
        });
        _bookingIdsBySerial[availability.serialNumber].push(bookingId);

        (bool sent, ) = payable(availability.owner).call{ value: ownerPayout }("");
        if (!sent) revert OwnerPayoutFailed();

        emit Booked(bookingId, availabilityId, availability.serialNumber, msg.sender, startDate, endDate, msg.value);
    }

    function cancelBooking(uint256 bookingId) external nonReentrant {
        Booking storage booking = bookingsById[bookingId];
        if (booking.id == 0) revert BookingNotFound(bookingId);
        if (booking.renter != msg.sender) revert NotBookingRenter();
        if (booking.status != BookingStatus.Active) revert BookingNotFound(bookingId);
        if (block.timestamp >= booking.startDate) revert BookingAlreadyStarted();

        booking.status = BookingStatus.Cancelled;
        uint256 refundAmount = booking.totalPaid;

        (bool refunded, ) = payable(msg.sender).call{ value: refundAmount }("");
        if (!refunded) revert FeeTransferFailed();

        emit BookingCancelled(bookingId, msg.sender, refundAmount);
    }

    function userOf(int64 serialNumber) external view returns (address) {
        uint256[] storage bookingIds = _bookingIdsBySerial[serialNumber];
        uint256 len = bookingIds.length;

        for (uint256 i = 0; i < len; i++) {
            Booking storage booking = bookingsById[bookingIds[i]];
            if (booking.status != BookingStatus.Active) continue;
            if (block.timestamp >= booking.startDate && block.timestamp < booking.endDate) {
                return booking.renter;
            }
        }

        return address(0);
    }

    function getBookings(int64 serialNumber) external view returns (Booking[] memory list) {
        uint256[] storage bookingIds = _bookingIdsBySerial[serialNumber];
        uint256 len = bookingIds.length;
        list = new Booking[](len);
        for (uint256 i = 0; i < len; i++) {
            list[i] = bookingsById[bookingIds[i]];
        }
    }

    function getAvailability(int64 serialNumber) external view returns (AvailabilityWindow[] memory list) {
        uint256[] storage availabilityIds = _availabilityIdsBySerial[serialNumber];
        uint256 len = availabilityIds.length;
        list = new AvailabilityWindow[](len);
        for (uint256 i = 0; i < len; i++) {
            list[i] = availabilities[availabilityIds[i]];
        }
    }

    function withdrawMarketplaceFees(address payable recipient) external onlyOwner nonReentrant {
        uint256 amount = accruedMarketplaceFees;
        if (amount == 0) revert NothingToWithdraw();
        accruedMarketplaceFees = 0;

        (bool sent, ) = recipient.call{ value: amount }("");
        if (!sent) revert FeeTransferFailed();

        emit MarketplaceFeesWithdrawn(recipient, amount);
    }

    function _ensureNoAvailabilityOverlap(int64 serialNumber, uint256 startDate, uint256 endDate) internal view {
        uint256[] storage availabilityIds = _availabilityIdsBySerial[serialNumber];
        uint256 len = availabilityIds.length;

        for (uint256 i = 0; i < len; i++) {
            AvailabilityWindow storage existing = availabilities[availabilityIds[i]];
            if (existing.status != AvailabilityStatus.Active) continue;
            if (_rangesOverlap(startDate, endDate, existing.windowStart, existing.windowEnd)) {
                revert OverlappingAvailability();
            }
        }
    }

    function _rangesOverlap(uint256 startA, uint256 endA, uint256 startB, uint256 endB) internal pure returns (bool) {
        return startA < endB && startB < endA;
    }

    function _requireDayAligned(uint256 timestamp) internal pure {
        if (timestamp % DAY != 0) revert DateNotDayAligned();
    }
}
