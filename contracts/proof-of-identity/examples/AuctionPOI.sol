// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "../interfaces/IProofOfIdentity.sol";

/**
 * @title AuctionPOI
 * @author Haven1 Dev Team
 * @dev Example implementation of using the Proof of Identity contract to
 * permission an auction.
 */
contract AuctionPOI is Ownable {
    /* STATE VARIABLES
    ==================================================*/
    /**
     * @dev Auction Type: Retail.
     * This value that only accounts marked as `retail` (`1`) on the
     * `ProofOfIdentity` contract will be allowed to participate in the auction.
     */
    uint256 private constant _RETAIL = 1;

    /**
     * @dev Auction Type: Institution.
     * This value means that only accounts marked as `institution` (`2`) on the
     * `ProofOfIdentity` contract will be allowed to participate in the auction.
     */
    uint256 private constant _INSTITUTION = 2;

    /**
     * @dev Auction Type: All.
     * Means that both `retial` (`1`) and `institution` (`2`) accounts as will
     * be allowed to participate in the auction.
     */
    uint256 private constant _ALL = 3;

    /**
     * @dev The type of the auction, either 1, 2 or 3.
     */
    uint256 private _auctionType;

    /**
     * @dev Whether the auction has started.
     */
    bool private _started;

    /**
     * @dev Whether the auction has ended.
     */
    bool private _finished;

    /**
     * The length, in seconds, of the auction.
     */
    uint256 private _auctionLength;

    /**
     * The unix timestamp of when the auction ends.
     * If 0, the auction has not started.
     * End time = _auctionStartTime + _auctionLength;
     */
    uint256 private _auctionEndTime;

    /**
     * @dev The Proof of Identity Contract.
     */
    IProofOfIdentity private _proofOfIdentity;

    /**
     * @dev The address of the highest bidder.
     */
    address private _highestBidder;

    /**
     * @dev The highest bid.
     */
    uint256 private _highestBid;

    /**
     * @dev The NFT prize.
     */
    IERC721 private _nft;

    /**
     * @dev The ID of the NFT prize.
     */
    uint256 private _nftId;

    /* EVENTS
    ==================================================*/
    /**
     * @notice Emits the new Proof of Identity contract address.
     * @param poiAddress The new Proof of Identity contract address.
     */
    event POIAddressUpdated(address indexed poiAddress);

    /**
     * @notice Notifies the start of an auction.
     */
    event AuctionStarted();

    /**
     * @notice Emits an event notifying that the auction has ended.
     */
    event AuctionEnded();

    /**
     * @notice Emits the address of the bidder and their bid.
     * @param bidder The address of the bidder.
     * @param amount The bid amount.
     */
    event BidPlaced(address indexed bidder, uint256 amount);

    /**
     * Emits the address of the winner and the winning bid.
     * @param winner The address of the winner.
     * @param amount The winning bid.
     */
    event NFTSent(address indexed winner, uint256 amount);

    /* ERRORS
    ==================================================*/
    /**
     * @notice Error to throw when the zero address has been supplied and it
     * is not allowed.
     */
    error AuctionPOI__ZeroAddress();

    /**
     * @notice Error to throw when an invalid auction type has been provided.
     */
    error AuctionPOI__InvalidAuctionType(uint256 typeProvided);

    /**
     * @notice Error to throw when an invalid auction length has been provided.
     */
    error AuctionPOI__InvalidAuctionLength(uint256 length);

    /**
     * @notice Error to throw when a feature that requires the auction to be
     * started is accessed while it is inactive.
     */
    error AuctionPOI__AuctionNotStarted();

    /**
     * @notice Error to throw when a feature that requires the auction to be
     * inactive is accessed while it is active.
     */
    error AuctionPOI__AuctionActive();

    /**
     * @notice Error to throw when a feature that requires the auction to be
     * inactive is accessed while it is active.
     */
    error AuctionPOI__AuctionFinished();

    /**
     * @notice Error to throw when an account does not have a Proof of Identity
     * NFT.
     */
    error AuctionPOI__NoIdentityNFT();

    /**
     * @notice Error to throw when an account is suspended.
     */
    error AuctionPOI__Suspended();

    /**
     * @notice Error to throw when an attribute has expired.
     * @param attribute The name of the required attribute
     */
    error AuctionPOI__AttributeExpired(string attribute, uint256 expiry);

    /**
     * @notice Error to throw when an attribute has expired.
     * @param userType The `userType` of the account.
     * @param required The required `userType`.
     */
    error AuctionPOI__UserType(uint256 userType, uint256 required);

    /**
     * @notice Error to throw when a bid is placed but it is not high enough.
     * @param bid The bid placed.
     * @param highestBid The current highest bid.
     */
    error AuctionPOI__BidTooLow(uint256 bid, uint256 highestBid);

    /**
     * @notice Error to throw when a bidder tries to outbid (/raise) themselves.
     */
    error AuctionPOI__AlreadyHighestBidder();

    /* MODIFIERS
    ==================================================*/
    /**
     * @dev Modifier to be used on any functions that require a user be
     * permissioned per this contract's definition.
     * Ensures that the account:
     * -    has a Proof of Identity NFT;
     * -    is not suspended; and
     * -    is of the requisite `userType`.
     *
     * May revert with `AuctionPOI__NoIdentityNFT`.
     * May revert with `AuctionPOI__Suspended`.
     * May revert with `AuctionPOI__UserType`.
     * May revert with `AuctionPOI__AttributeExpired`.
     */
    modifier onlyPermissioned(address account) {
        // ensure the account has a Proof of Identity NFT
        if (!_hasID(account)) revert AuctionPOI__NoIdentityNFT();

        // ensure the account is not suspended
        if (_isSuspended(account)) revert AuctionPOI__Suspended();

        // ensure the account has a valid `userType`
        _checkUserTypeExn(account);
        _;
    }

    /* FUNCTIONS
    ==================================================*/
    /* Constructor
    ========================================*/
    /**
     * @param proofOfIdentity_ The address of the Proof of Identity contract.
     * @param auctionType_ The type of the auction.
     * @param auctionLength_ The length, in sec, of the auction.
     * @param startingBid_ The starting bid for the auction.
     * @param nft_ The address of the NFT collection to use as the prize.
     * @param nftId_ The ID of the prize NFT.
     */
    constructor(
        address proofOfIdentity_,
        uint256 auctionType_,
        uint256 auctionLength_,
        uint256 startingBid_,
        address nft_,
        uint256 nftId_
    ) {
        if (auctionType_ == 0 || auctionType_ > _ALL) {
            revert AuctionPOI__InvalidAuctionType(auctionType_);
        }

        if (auctionLength_ == 0) {
            revert AuctionPOI__InvalidAuctionLength(auctionLength_);
        }

        _setPOIAddress(proofOfIdentity_);

        _auctionType = auctionType_;
        _auctionLength = auctionLength_;

        _highestBid = startingBid_;

        _nft = IERC721(nft_);
        _nftId = nftId_;
    }

    /* External
    ========================================*/
    /**
     * @notice Places a bid. If the bid placed is not higher than the current
     * highest bid, this function will revert.
     * If the bid is sufficiently high, the previous bid will be refunded to the
     * previous highest bidder.
     *
     * @dev Note that in production, as this function is `payable` it really
     * should be protected with a reentrancy guard as it transfers control to the
     * refunded account.
     * May revert with `AuctionPOI__NoIdentityNFT`.
     * May revert with `AuctionPOI__Suspended`.
     * May revert with `AuctionPOI__UserType`.
     * May revert with `AuctionPOI__AttributeExpired`.
     * May revert with `AuctionPOI__AuctionNotStarted`.
     * May revert with `AuctionPOI__AuctionFinished`.
     * May revert with `AuctionPOI__BidTooLow`.
     * May emit a `BidPlaced` event.
     */
    function bid() external payable onlyPermissioned(msg.sender) {
        if (!_started) revert AuctionPOI__AuctionNotStarted();

        if (block.timestamp > _auctionEndTime) {
            revert AuctionPOI__AuctionFinished();
        }

        uint256 v = msg.value;
        address a = msg.sender;

        if (v <= _highestBid) revert AuctionPOI__BidTooLow(v, _highestBid);
        if (a == _highestBidder) revert AuctionPOI__AlreadyHighestBidder();

        _refundBid();

        _highestBidder = a;
        _highestBid = v;

        emit BidPlaced(a, v);
    }

    /**
     * @notice Returns whether an `account` is eligible to participate in the
     * auction.
     *
     * @param account The account to check.
     *
     * @return True if the account can place a bid, false otherwise.
     *
     * @dev Requires that the account:
     * -    has a Proof of Identity NFT;
     * -    is not suspended; and
     * -    has the requisite `userType`.
     */
    function accountEligible(address account) external view returns (bool) {
        if (!_hasID(account)) return false;
        if (_isSuspended(account)) return false;
        if (!_checkUserType(account)) return false;
        return true;
    }

    /**
     * @notice Returns the highest bidder. If the auction has ended, returns
     * the winner of the auction.
     * @return The address of the highest / winning bidder.
     */
    function getHighestBidder() external view returns (address) {
        return _highestBidder;
    }

    /**
     * @notice Returns the highest bid. If the auction has ended, returns the
     * winning bid.
     * @return The highest / winning bid.
     */
    function getHighestBid() external view returns (uint256) {
        return _highestBid;
    }

    /**
     * @notice Returns the address of the prize NFT and the NFT ID.
     * @return Tuple containing the address of the prize NFT and its ID.
     */
    function getNFT() external view returns (address, uint256) {
        return (address(_nft), _nftId);
    }

    /**
     * @notice Returns whether the auction has started.
     * @return True if it has started, false otherwise.
     */
    function hasStarted() external view returns (bool) {
        return _started;
    }

    /**
     * @notice Returns whether the auction has finished.
     * @return True if it has finished, false otherwise.
     */
    function hasFinished() external view returns (bool) {
        return _finished || block.timestamp > _auctionEndTime;
    }

    /**
     * @notice Returns whether the auction is in progress.
     * @return True if it is in progress, false otherwise.
     */
    function inProgress() external view returns (bool) {
        return _started && !_finished;
    }

    /**
     * @notice Returns the unix timestamp of when the auction is finished.
     * @return The unix timestamp of when the auction is finished.
     */
    function getFinishTime() external view returns (uint256) {
        return _auctionEndTime;
    }

    /**
     * @notice Returns the type of the auction:
     *   -   1: Retail
     *   -   2: Institution
     *   -   3: All
     *
     * @return The type of the auction.
     */
    function getAuctionType() external view returns (uint256) {
        return _auctionType;
    }

    /**
     * @notice Returns the length, in seconds, of the auction.
     * @return The length, in seconds, of the auction.
     */
    function getAuctionLength() external view returns (uint256) {
        return _auctionLength;
    }

    /**
     * @notice Returns the address of the Proof of Identity contract.
     * @return The Proof of Identity address.
     */
    function poiAddress() external view returns (address) {
        return address(_proofOfIdentity);
    }

    /* Public
    ========================================*/
    /**
     * @notice Starts the auction.
     * @dev May revert with:
     *  /^AccessControl: account (0x[0-9a-f]{40}) is missing role (0x[0-9a-f]{64})$/
     * May revert with `AuctionPOI__AuctionActive`.
     * May revert with `AuctionPOI__AuctionFinished`.
     * May emit an `AuctionStarted` event.
     */
    function startAuction() public onlyOwner {
        // No need to check _finished as once started, `_started` does not get
        // flipped back false
        if (_started) revert AuctionPOI__AuctionActive();

        _nft.transferFrom(msg.sender, address(this), _nftId);

        _started = true;
        _auctionEndTime = block.timestamp + _auctionLength;

        emit AuctionStarted();
    }

    /**
     * @notice Ends the auction.
     *
     * @dev Note that in production, the transfer of H1 should not happen
     * optimistically.
     * May revert with `AuctionPOI__AuctionNotStarted`.
     * May revert with `AuctionPOI__AuctionActive`.
     * May revert with `AuctionPOI__AuctionFinished`.
     * May emit an `NFTSend` event.
     * May emit an `AuctionEnded` event.
     */
    function endAuction() public {
        uint256 ts = block.timestamp;

        if (!_started) revert AuctionPOI__AuctionNotStarted();
        if (ts < _auctionEndTime) revert AuctionPOI__AuctionActive();
        if (_finished) revert AuctionPOI__AuctionFinished();

        _finished = true;

        if (_highestBidder != address(0)) {
            _nft.safeTransferFrom(address(this), _highestBidder, _nftId);

            // transfer optimistically for the sake of this demo
            _withdraw(payable(owner()), address(this).balance);
            emit NFTSent(_highestBidder, _highestBid);
        } else {
            _nft.safeTransferFrom(address(this), owner(), _nftId);
        }

        emit AuctionEnded();
    }

    /* Private
    ========================================*/
    /**
     * @notice Refunds the previous highest bidder.
     *
     * @dev Note that in production, the transfer of H1 should not happen
     * optimistically.
     * Will set the current highest bidder to the zero (0) address.
     * Will set the highest bid to zero (0).
     * The calling code must implement `nonReentrant` as this call transfers
     * control to the `_highestBidder`.
     * May revert with `AuctionPOI__RefundFailed`.
     *
     */
    function _refundBid() private {
        if (_highestBidder == address(0)) return;

        address prevAddr = _highestBidder;
        uint256 prevBid = _highestBid;

        _highestBidder = address(0);
        _highestBid = 0;

        // transfer optimistically for the sake of this demo
        _withdraw(payable(prevAddr), prevBid);
    }

    /**
     * @notice Sends an `amount` of H1 to the `to` address.
     * @param to The address to send the H1 to.
     * @param amount The amount to send.
     *
     * @return True if transfer succeeded, false otherwise.
     */
    function _withdraw(
        address payable to,
        uint256 amount
    ) private returns (bool) {
        (bool success, ) = to.call{value: amount}("");
        return success;
    }

    /**
     * @notice Sets the Proof of Identity contract address.
     * @param poi The address for the Proof of Identity contract.
     * @dev May revert with:
     *  /^AccessControl: account (0x[0-9a-f]{40}) is missing role (0x[0-9a-f]{64})$/
     * May revert with `AuctionPOI__ZeroAddress`.
     * May emit a `POIAddressUpdated` event.
     */
    function _setPOIAddress(address poi) private {
        if (poi == address(0)) revert AuctionPOI__ZeroAddress();
        _proofOfIdentity = IProofOfIdentity(poi);
        emit POIAddressUpdated(poi);
    }

    /**
     * @notice Validates that a given `expiry` is greater than the current
     * `block.timestamp`.
     *
     * @param expiry The expiry to check.
     *
     * @return True if the expiry is greater than the current timestamp, false
     * otherwise.
     */
    function _validateExpiry(uint256 expiry) private view returns (bool) {
        return expiry > block.timestamp;
    }

    /**
     * @notice Returns whether an account holds a Proof of Identity NFT.
     * @param account The account to check.
     * @return True if the account holds a Proof of Identity NFT, else false.
     */
    function _hasID(address account) private view returns (bool) {
        return _proofOfIdentity.balanceOf(account) > 0;
    }

    /**
     * @notice Returns whether an account is suspended.
     * @param account The account to check.
     * @return True if the account is suspended, false otherwise.
     */
    function _isSuspended(address account) private view returns (bool) {
        return _proofOfIdentity.isSuspended(account);
    }

    /**
     * @dev Determines whether a given user type meets the requirements for
     * the action.
     * Note: Does not validate the expiry.
     */
    function _hasType(uint256 userType) private view returns (bool) {
        return (_auctionType & userType) > 0;
    }

    /**
     * @notice Helper function to check whether a given `account`'s `userType`
     * is valid.
     *
     * @param account The account to check.
     *
     * @return True if the check is valid, false otherwise.
     *
     * @dev For a `userType` to be valid, it must:
     * -    not be expired; and
     * -    the `_auctionType` must either match the `userType`, or be set to
     * -     `_ALL` (`3`).
     */
    function _checkUserType(address account) private view returns (bool) {
        (uint256 user, uint256 exp, ) = _proofOfIdentity.getUserType(account);
        if (!_hasType(user)) return false;
        if (!_validateExpiry(exp)) return false;
        return true;
    }

    /**
     * @notice Similar to `_checkUserType`, but rather than returning a `bool`,
     * will revert if the check fails.
     *
     * @param account The account to check.
     *
     * @dev For a `userType` to be valid, it must:
     * -    not be expired; and
     * -    the `_auctionType` must either match the `userType`, or be set to
     * -     `_ALL` (`3`).
     *
     * May revert with `AuctionPOI__UserType`.
     * May revert with `AuctionPOI__AttributeExpired`.
     */
    function _checkUserTypeExn(address account) private view {
        (uint256 user, uint256 exp, ) = _proofOfIdentity.getUserType(account);

        if (!_hasType(user)) revert AuctionPOI__UserType(user, _auctionType);

        if (!_validateExpiry(exp)) {
            revert AuctionPOI__AttributeExpired("userType", exp);
        }
    }
}
