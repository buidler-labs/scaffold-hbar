// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ISubscriptionNFT {
    /// @notice Subscription metadata tracked by the NFT contract.
    struct SubscriptionData {
        /// @notice Account that originally minted the subscription NFT.
        address minter;
        /// @notice Human-readable provider label.
        string provider;
        /// @notice Human-readable plan/tier label.
        string serviceTier;
        /// @notice Subscription start timestamp (inclusive, Unix seconds).
        uint256 startDate;
        /// @notice Subscription end timestamp (exclusive, Unix seconds).
        uint256 endDate;
    }

    /// @notice Returns subscription metadata for a serial.
    /// @param serialNumber Target subscription serial number.
    /// @return Subscription metadata struct.
    function getSubscription(int64 serialNumber) external view returns (SubscriptionData memory);
    /// @notice Returns the subscription end timestamp for a serial.
    /// @param serialNumber Target subscription serial number.
    /// @return endDate Subscription end timestamp (exclusive, Unix seconds).
    function getEndDate(int64 serialNumber) external view returns (uint256);
    /// @notice Returns whether a subscription serial is currently expired.
    /// @param serialNumber Target subscription serial number.
    /// @return expired True when the subscription has expired.
    function isExpired(int64 serialNumber) external view returns (bool);
    /// @notice Returns current token owner for a serial.
    /// @param serialNumber Target subscription serial number.
    /// @return owner Current owner account.
    function currentOwner(int64 serialNumber) external view returns (address);
}

/// @title SubscriptionMarketplace
/// @notice Fixed-price booking registry for subscription NFTs.
/// @dev Booking windows are day-aligned and represented as half-open ranges: [startDate, endDate).
contract SubscriptionMarketplace is Ownable, ReentrancyGuard {
    /// @notice Basis points denominator for fee calculations.
    uint256 public constant BPS_DENOMINATOR = 10_000;
    /// @notice Day size used for alignment and booking length.
    uint256 public constant DAY = 1 days;

    /// @notice Availability listing lifecycle status.
    enum AvailabilityStatus {
        Active,
        Removed
    }

    /// @notice Booking lifecycle status.
    enum BookingStatus {
        Active,
        Cancelled
    }

    /// @notice Listing data for a serial's rentable time window.
    struct AvailabilityWindow {
        /// @notice Internal listing identifier.
        uint256 id;
        /// @notice Creator address captured at listing creation time.
        address owner;
        /// @notice Subscription NFT serial being listed.
        int64 serialNumber;
        /// @notice Start of listing window (inclusive, Unix seconds).
        uint256 windowStart;
        /// @notice End of listing window (exclusive, Unix seconds).
        uint256 windowEnd; // exclusive
        /// @notice Fixed rental price per day in wei.
        uint256 pricePerDay;
        /// @notice Current listing lifecycle status.
        AvailabilityStatus status;
    }

    /// @notice Booking data recorded for a rented time slice.
    struct Booking {
        /// @notice Internal booking identifier.
        uint256 id;
        /// @notice Renter account.
        address renter;
        /// @notice Linked availability identifier.
        uint256 availabilityId;
        /// @notice Subscription NFT serial being booked.
        int64 serialNumber;
        /// @notice Booking start timestamp (inclusive, Unix seconds).
        uint256 startDate;
        /// @notice Booking end timestamp (exclusive, Unix seconds).
        uint256 endDate; // exclusive
        /// @notice Total amount paid by renter.
        uint256 totalPaid;
        /// @notice Marketplace fee portion in wei.
        uint256 feeAmount;
        /// @notice Owner payout portion in wei.
        uint256 ownerPayout;
        /// @notice True after owner payout is claimed.
        bool payoutClaimed;
        /// @notice Current booking lifecycle status.
        BookingStatus status;
    }

    /// @notice Subscription NFT contract used for ownership and metadata checks.
    ISubscriptionNFT public immutable subscriptionNFT;
    /// @notice Marketplace fee in basis points charged per booking.
    uint16 public marketplaceFeeBps;
    /// @notice Fees accumulated and pending owner withdrawal.
    uint256 public accruedMarketplaceFees;

    /// @notice Next id to assign to a new availability listing.
    uint256 public nextAvailabilityId = 1;
    /// @notice Next id to assign to a new booking.
    uint256 public nextBookingId = 1;

    /// @notice Mapping of availability id to availability details.
    mapping(uint256 availabilityId => AvailabilityWindow availability) public availabilities;
    /// @notice Mapping of booking id to booking details.
    mapping(uint256 bookingId => Booking booking) public bookingsById;
    /// @notice Serial to all booking ids ever created for that serial.
    mapping(int64 serialNumber => uint256[] bookingIds) private _bookingIdsBySerial;
    /// @notice Serial to all availability ids ever created for that serial.
    mapping(int64 serialNumber => uint256[] availabilityIds) private _availabilityIdsBySerial;

    /// @notice Ensures a timestamp is aligned to UTC day boundaries (00:00:00).
    /// @param timestamp Timestamp to validate.
    modifier dayAligned(uint256 timestamp) {
        if (timestamp % DAY != 0) revert DateNotDayAligned();
        _;
    }

    /// @notice Restricts execution to the live owner of a subscription serial.
    /// @param serialNumber Serial number checked against `subscriptionNFT.currentOwner`.
    modifier onlyCurrentSubscriptionOwner(int64 serialNumber) {
        _requireCurrentSubscriptionOwner(serialNumber);
        _;
    }

    /// @notice Restricts execution to the live owner of the availability's serial.
    /// @param availabilityId Availability id whose serial ownership is validated.
    modifier onlyCurrentAvailabilityOwner(uint256 availabilityId) {
        AvailabilityWindow storage availability = availabilities[availabilityId];
        if (availability.id == 0) revert AvailabilityNotFound(availabilityId);
        if (availability.status != AvailabilityStatus.Active) revert AvailabilityInactive(availabilityId);
        _requireCurrentSubscriptionOwner(availability.serialNumber);
        _;
    }

    /// @notice Restricts execution to the live owner of the booking's serial.
    /// @param bookingId Booking id whose serial ownership is validated.
    modifier onlyCurrentBookingOwner(uint256 bookingId) {
        Booking storage booking = bookingsById[bookingId];
        if (booking.id == 0) revert BookingNotFound(bookingId);
        AvailabilityWindow storage availability = availabilities[booking.availabilityId];
        _requireCurrentSubscriptionOwner(availability.serialNumber);
        _;
    }

    /// @notice Emitted when a new availability listing is created.
    event AvailabilityCreated(
        uint256 indexed availabilityId,
        int64 indexed serialNumber,
        address indexed owner,
        uint256 windowStart,
        uint256 windowEnd,
        uint256 pricePerDay
    );
    /// @notice Emitted when a listing price is updated.
    event AvailabilityPriceUpdated(uint256 indexed availabilityId, uint256 oldPricePerDay, uint256 newPricePerDay);
    /// @notice Emitted when a listing is removed.
    event AvailabilityRemoved(uint256 indexed availabilityId);
    /// @notice Emitted when a booking is created and payment is escrowed.
    event Booked(
        uint256 indexed bookingId,
        uint256 indexed availabilityId,
        int64 indexed serialNumber,
        address renter,
        uint256 startDate,
        uint256 endDate,
        uint256 totalPaid
    );
    /// @notice Emitted when a renter cancels an active pre-start booking.
    event BookingCancelled(uint256 indexed bookingId, address indexed renter, uint256 refundedAmount);
    /// @notice Emitted when owner payout is claimed for a started booking.
    event BookingPayoutClaimed(uint256 indexed bookingId, address indexed owner, uint256 ownerPayout, uint256 feeAmount);
    /// @notice Emitted when marketplace fee basis points change.
    event MarketplaceFeeUpdated(uint16 oldFeeBps, uint16 newFeeBps);
    /// @notice Emitted when marketplace owner withdraws accrued fees.
    event MarketplaceFeesWithdrawn(address indexed recipient, uint256 amount);

    /// @notice Thrown when marketplace fee exceeds 100%.
    /// @param feeBps Invalid fee value in basis points.
    error InvalidFeeBps(uint256 feeBps);
    /// @notice Thrown when the subscription NFT address is zero.
    error InvalidSubscriptionNFTAddress();
    /// @notice Thrown when provided start/end timestamps do not form a valid half-open range.
    error InvalidDateRange();
    /// @notice Thrown when a timestamp is not aligned to midnight UTC.
    error DateNotDayAligned();
    /// @notice Thrown when price input is zero.
    error InvalidPrice();
    /// @notice Thrown when requested booking duration is zero days.
    error InvalidNumberOfDays();
    /// @notice Thrown when availability id does not exist.
    /// @param availabilityId Missing availability identifier.
    error AvailabilityNotFound(uint256 availabilityId);
    /// @notice Thrown when booking id does not exist.
    /// @param bookingId Missing booking identifier.
    error BookingNotFound(uint256 bookingId);
    /// @notice Thrown when booking exists but is not active.
    /// @param bookingId Inactive booking identifier.
    error BookingInactive(uint256 bookingId);
    /// @notice Thrown when availability exists but is not active.
    /// @param availabilityId Inactive availability identifier.
    error AvailabilityInactive(uint256 availabilityId);
    /// @notice Thrown when caller is not the renter of the booking.
    error NotBookingRenter();
    /// @notice Thrown when a cancellation is attempted after booking start.
    error BookingAlreadyStarted();
    /// @notice Thrown when subscription is expired.
    /// @param serialNumber Expired subscription serial.
    error SubscriptionExpired(int64 serialNumber);
    /// @notice Thrown when caller is not current owner of subscription serial.
    /// @param serialNumber Unauthorized subscription serial.
    error UnauthorizedSubscriptionOwner(int64 serialNumber);
    /// @notice Thrown when availability window lies outside subscription validity range.
    error AvailabilityOutOfSubscriptionBounds();
    /// @notice Thrown when booking window lies outside availability range.
    error BookingOutOfAvailabilityBounds();
    /// @notice Thrown when a new availability overlaps another active availability.
    error OverlappingAvailability();
    /// @notice Thrown when a booking overlaps an active non-expired booking.
    error OverlappingBooking();
    /// @notice Thrown when payment does not equal expected booking price.
    /// @param expected Expected payment amount in wei.
    /// @param received Received payment amount in wei.
    error IncorrectPayment(uint256 expected, uint256 received);
    /// @notice Thrown when a value transfer for fee/refund fails.
    error FeeTransferFailed();
    /// @notice Thrown when owner payout transfer fails.
    error OwnerPayoutFailed();
    /// @notice Thrown when payout is claimed before booking start.
    error PayoutNotAvailableYet();
    /// @notice Thrown when payout has already been claimed.
    error PayoutAlreadyClaimed();
    /// @notice Thrown when no marketplace fees are available to withdraw.
    error NothingToWithdraw();

    /// @notice Initializes marketplace ownership, NFT reference, and fee settings.
    /// @param initialOwner Account receiving Ownable privileges.
    /// @param subscriptionNFTAddress Subscription NFT contract address.
    /// @param initialMarketplaceFeeBps Initial marketplace fee in basis points.
    constructor(address initialOwner, address subscriptionNFTAddress, uint16 initialMarketplaceFeeBps) Ownable(initialOwner) {
        if (subscriptionNFTAddress == address(0)) revert InvalidSubscriptionNFTAddress();
        if (initialMarketplaceFeeBps > BPS_DENOMINATOR) revert InvalidFeeBps(initialMarketplaceFeeBps);

        subscriptionNFT = ISubscriptionNFT(subscriptionNFTAddress);
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

    /// @notice Creates a rentable availability window for a subscription serial.
    /// @param serialNumber Subscription NFT serial to list.
    /// @param windowStart Listing start timestamp (inclusive, Unix seconds), day-aligned.
    /// @param windowEnd Listing end timestamp (exclusive, Unix seconds), day-aligned.
    /// @param pricePerDay Fixed rental price per day in wei.
    /// @return availabilityId Newly created availability id.
    function createAvailability(int64 serialNumber, uint256 windowStart, uint256 windowEnd, uint256 pricePerDay)
        external
        dayAligned(windowStart)
        dayAligned(windowEnd)
        onlyCurrentSubscriptionOwner(serialNumber)
        returns (uint256 availabilityId)
    {
        if (pricePerDay == 0) revert InvalidPrice();
        if (windowStart >= windowEnd) revert InvalidDateRange();

        ISubscriptionNFT.SubscriptionData memory subscription = subscriptionNFT.getSubscription(serialNumber);
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

    /// @notice Updates fixed daily price of an active availability listing.
    /// @param availabilityId Target availability id.
    /// @param newPricePerDay New price per day in wei.
    function updateAvailability(uint256 availabilityId, uint256 newPricePerDay)
        external
        onlyCurrentAvailabilityOwner(availabilityId)
    {
        if (newPricePerDay == 0) revert InvalidPrice();

        AvailabilityWindow storage availability = availabilities[availabilityId];
        uint256 oldPrice = availability.pricePerDay;
        availability.pricePerDay = newPricePerDay;
        emit AvailabilityPriceUpdated(availabilityId, oldPrice, newPricePerDay);
    }

    /// @notice Removes an active availability listing if no overlapping active booking remains.
    /// @param availabilityId Target availability id.
    function removeAvailability(uint256 availabilityId) external onlyCurrentAvailabilityOwner(availabilityId) {
        AvailabilityWindow storage availability = availabilities[availabilityId];

        uint256[] storage bookingIds = _bookingIdsBySerial[availability.serialNumber];
        uint256 len = bookingIds.length;
        for (uint256 i = 0; i < len; i++) {
            Booking storage booking = bookingsById[bookingIds[i]];
            if (booking.status != BookingStatus.Active) continue;
            if (_isBookingExpired(booking)) continue;
            if (_rangesOverlap(availability.windowStart, availability.windowEnd, booking.startDate, booking.endDate)) {
                revert OverlappingBooking();
            }
        }

        availability.status = AvailabilityStatus.Removed;
        emit AvailabilityRemoved(availabilityId);
    }

    /// @notice Books consecutive day-aligned dates within an active availability window.
    /// @param availabilityId Target availability id.
    /// @param startDate Booking start timestamp (inclusive, Unix seconds), day-aligned.
    /// @param numberOfDays Number of rental days to book.
    /// @return bookingId Newly created booking id.
    function book(uint256 availabilityId, uint256 startDate, uint256 numberOfDays)
        external
        payable
        nonReentrant
        dayAligned(startDate)
        returns (uint256 bookingId)
    {
        if (numberOfDays == 0) revert InvalidNumberOfDays();

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
            if (_isBookingExpired(existing)) continue;
            if (_rangesOverlap(startDate, endDate, existing.startDate, existing.endDate)) {
                revert OverlappingBooking();
            }
        }

        uint256 expectedPayment = availability.pricePerDay * numberOfDays;
        if (msg.value != expectedPayment) revert IncorrectPayment(expectedPayment, msg.value);

        uint256 feeAmount = (msg.value * marketplaceFeeBps) / BPS_DENOMINATOR;
        uint256 ownerPayout = msg.value - feeAmount;

        bookingId = nextBookingId++;
        bookingsById[bookingId] = Booking({
            id: bookingId,
            renter: msg.sender,
            availabilityId: availabilityId,
            serialNumber: availability.serialNumber,
            startDate: startDate,
            endDate: endDate,
            totalPaid: msg.value,
            feeAmount: feeAmount,
            ownerPayout: ownerPayout,
            payoutClaimed: false,
            status: BookingStatus.Active
        });
        _bookingIdsBySerial[availability.serialNumber].push(bookingId);

        emit Booked(bookingId, availabilityId, availability.serialNumber, msg.sender, startDate, endDate, msg.value);
    }

    /// @notice Cancels an active booking before its start time and refunds renter in full.
    /// @param bookingId Booking id to cancel.
    function cancelBooking(uint256 bookingId) external nonReentrant {
        Booking storage booking = bookingsById[bookingId];
        if (booking.id == 0) revert BookingNotFound(bookingId);
        if (booking.renter != msg.sender) revert NotBookingRenter();
        if (booking.status != BookingStatus.Active) revert BookingInactive(bookingId);
        if (block.timestamp >= booking.startDate) revert BookingAlreadyStarted();

        booking.status = BookingStatus.Cancelled;
        uint256 refundAmount = booking.totalPaid;

        (bool refunded, ) = payable(msg.sender).call{ value: refundAmount }("");
        if (!refunded) revert FeeTransferFailed();

        emit BookingCancelled(bookingId, msg.sender, refundAmount);
    }

    /// @notice Claims the owner payout for a started booking.
    /// @dev Marketplace fee is recognized only when owner payout is claimed.
    /// @param bookingId Booking id to settle.
    function claimBookingPayout(uint256 bookingId) external nonReentrant onlyCurrentBookingOwner(bookingId) {
        Booking storage booking = bookingsById[bookingId];
        if (booking.status != BookingStatus.Active) revert BookingInactive(bookingId);
        if (booking.payoutClaimed) revert PayoutAlreadyClaimed();
        if (block.timestamp < booking.startDate) revert PayoutNotAvailableYet();

        address payoutRecipient = msg.sender;

        booking.payoutClaimed = true;
        accruedMarketplaceFees += booking.feeAmount;

        (bool sent, ) = payable(payoutRecipient).call{ value: booking.ownerPayout }("");
        if (!sent) revert OwnerPayoutFailed();

        emit BookingPayoutClaimed(bookingId, payoutRecipient, booking.ownerPayout, booking.feeAmount);
    }

    /// @notice Returns active renter for a serial at current block timestamp.
    /// @param serialNumber Serial number to inspect.
    /// @return renter Active renter address or zero address when none is active.
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

    /// @notice Returns all bookings ever created for a serial.
    /// @param serialNumber Serial number to inspect.
    /// @return list Booking array in insertion order.
    function getBookings(int64 serialNumber) external view returns (Booking[] memory list) {
        uint256[] storage bookingIds = _bookingIdsBySerial[serialNumber];
        uint256 len = bookingIds.length;
        list = new Booking[](len);
        for (uint256 i = 0; i < len; i++) {
            list[i] = bookingsById[bookingIds[i]];
        }
    }

    /// @notice Returns all availability listings ever created for a serial.
    /// @param serialNumber Serial number to inspect.
    /// @return list Availability array in insertion order.
    function getAvailability(int64 serialNumber) external view returns (AvailabilityWindow[] memory list) {
        uint256[] storage availabilityIds = _availabilityIdsBySerial[serialNumber];
        uint256 len = availabilityIds.length;
        list = new AvailabilityWindow[](len);
        for (uint256 i = 0; i < len; i++) {
            list[i] = availabilities[availabilityIds[i]];
        }
    }

    /// @notice Withdraws all accrued marketplace fees to recipient.
    /// @param recipient Address receiving withdrawn fees.
    function withdrawMarketplaceFees(address payable recipient) external onlyOwner nonReentrant {
        uint256 amount = accruedMarketplaceFees;
        if (amount == 0) revert NothingToWithdraw();
        accruedMarketplaceFees = 0;

        (bool sent, ) = recipient.call{ value: amount }("");
        if (!sent) revert FeeTransferFailed();

        emit MarketplaceFeesWithdrawn(recipient, amount);
    }

    /// @notice Ensures no active availability window overlaps the provided half-open range.
    /// @param serialNumber Serial number to validate against.
    /// @param startDate Proposed start timestamp (inclusive, Unix seconds).
    /// @param endDate Proposed end timestamp (exclusive, Unix seconds).
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

    /// @notice Determines if two half-open date ranges overlap.
    /// @param startA Range A start (inclusive).
    /// @param endA Range A end (exclusive).
    /// @param startB Range B start (inclusive).
    /// @param endB Range B end (exclusive).
    /// @return overlaps True when ranges overlap.
    function _rangesOverlap(uint256 startA, uint256 endA, uint256 startB, uint256 endB) internal pure returns (bool) {
        return startA < endB && startB < endA;
    }

    /// @notice Checks whether a booking has reached or passed its end timestamp.
    /// @param booking Booking storage reference.
    /// @return expired True when `block.timestamp` is at or beyond booking end.
    function _isBookingExpired(Booking storage booking) internal view returns (bool) {
        return block.timestamp >= booking.endDate;
    }

    /// @notice Reverts unless caller is current owner of the given subscription serial.
    /// @param serialNumber Serial number to validate.
    function _requireCurrentSubscriptionOwner(int64 serialNumber) internal view {
        address currentOwner = subscriptionNFT.currentOwner(serialNumber);
        if (currentOwner != msg.sender) revert UnauthorizedSubscriptionOwner(serialNumber);
    }
}
