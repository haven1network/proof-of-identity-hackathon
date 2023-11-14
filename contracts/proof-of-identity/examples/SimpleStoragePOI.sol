// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "../interfaces/IProofOfIdentity.sol";

/**
 * @title SimpleStoragePOI
 * @author Haven1 Dev Team
 * @dev Example implementation of using the Proof of Identity contract to
 * permission access to a feature. Here, only users who have established a
 * sufficiently high competency rating will be allowed to set a value on the
 * contract. Read permission is available to all.
 */
contract SimpleStoragePOI is AccessControl {
    /* STATE VARIABLES
    ==================================================*/
    /**
     * @dev The stored value.
     */
    uint256 private _value;

    /**
     * @dev The competency rating threshold that must be met in order for an
     * account to pass the competency rating check.
     */
    uint256 private _competencyRatingThreshold;

    /**
     * @dev The Proof of Identity Contract.
     */
    IProofOfIdentity private _proofOfIdentity;

    /* EVENTS
    ==================================================*/
    /**
     * @notice Emits the address that updated the value and the new value.
     * @param by The address the updated the value.
     * @param value The new value that was set.
     */
    event ValueSet(address indexed by, uint256 indexed value);

    /**
     * @notice Emits the new competency rating threshold value.
     * @param threshold The new competency rating threshold value.
     */
    event CompetencyRatingThresholdUpdated(uint256 threshold);

    /**
     * @notice Emits the new Proof of Identity contract address.
     * @param poiAddress The new Proof of Identity contract address.
     */
    event POIAddressUpdated(address indexed poiAddress);

    /* ERRORS
    ==================================================*/
    /**
     * @notice Error to throw when the zero address has been supplied and it
     * is not allowed.
     */
    error SimpleStoragePOI__ZeroAddress();

    /**
     * @notice Error to throw when an account does not have a Proof of Identity
     * NFT.
     */
    error SimpleStoragePOI__NoIdentityNFT();

    /**
     * @notice Error to throw when an account is suspended.
     */
    error SimpleStoragePOI__Suspended();

    /**
     * @notice Error to throw when an invalid competency rating has been supplied.
     * @param rating The account's current competency rating.
     * @param threshold The minimum required competency rating.
     */
    error SimpleStoragePOI__CompetencyRating(uint256 rating, uint256 threshold);

    /**
     * @notice Error to throw when an attribute has expired.
     * @param attribute The name of the required attribute
     */
    error SimpleStoragePOI__AttributeExpired(string attribute, uint256 expiry);

    /* MODIFIERS
    ==================================================*/
    /**
     * @dev Modifier to be used on any functions that require a user be
     * permissioned per this contract's definition.
     * Ensures that the account:
     * -    has a Proof of Identity NFT;
     * -    is not suspended; and
     * -    has established a sufficiently high competency rating and it is not
     *      expired.
     *
     * May revert with `SimpleStoragePOI__NoIdentityNFT`.
     * May revert with `SimpleStoragePOI__Suspended`.
     * May revert with `SimpleStoragePOI__CompetencyRating`.
     * May revert with `SimpleStoragePOI__AttributeExpired`.
     */
    modifier onlyPermissioned(address account) {
        // ensure the account has a Proof of Identity NFT
        if (!_hasID(account)) revert SimpleStoragePOI__NoIdentityNFT();

        // ensure the account is not suspended
        if (_isSuspended(account)) revert SimpleStoragePOI__Suspended();

        // ensure the account has a valid competency rating
        _checkCompetencyRatingExn(account);

        _;
    }

    /* FUNCTIONS
    ==================================================*/
    /* Constructor
    ========================================*/
    /**
     * @param admin The address of the admin.
     * @param proofOfIdentity_ The address of the Proof of Identity contract.
     * @param competencyRatingThreshold_ The competency rating threshold that
     * be met.
     */
    constructor(
        address admin,
        address proofOfIdentity_,
        uint256 competencyRatingThreshold_
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        setPOIAddress(proofOfIdentity_);
        setCompetencyRatingThreshold(competencyRatingThreshold_);
    }

    /* External
    ========================================*/
    /**
     * @notice Allows permissioned accounts to set a new value.
     *
     * @param value_ The new value to set.
     *
     * @dev
     * May revert with `SimpleStoragePOI__NoIdentityNFT`.
     * May revert with `SimpleStoragePOI__Suspended`.
     * May revert with `SimpleStoragePOI__CompetencyRating`.
     * May revert with `SimpleStoragePOI__AttributeExpired`.
     */
    function setValue(uint256 value_) external onlyPermissioned(msg.sender) {
        _value = value_;
        emit ValueSet(msg.sender, value_);
    }

    /**
     * @notice Returns the current `_value`.
     * @return The current `_value`.
     */
    function getValue() external view returns (uint256) {
        return _value;
    }

    /**
     * @notice Returns the competency rating threshold.
     * @return The competency rating threshold.
     */
    function getCompetencyRatingThreshold() external view returns (uint256) {
        return _competencyRatingThreshold;
    }

    /**
     * @notice Returns the address of the Proof of Identity contract.
     * @return The Proof of Identity address.
     */
    function poiAddress() external view returns (address) {
        return address(_proofOfIdentity);
    }

    /**
     * @notice Returns if a given account has permission to update the `_value`.
     *
     * @param account The account to check.
     *
     * @return True if the account can update the `_value`, false otherwise.
     *
     * @dev Requires that the account:
     * -    has a Proof of Identity NFT;
     * -    is not suspended; and
     * -    has established a sufficiently high competency rating and it is not
     *      expired.
     */
    function canSet(address account) external view returns (bool) {
        if (!_hasID(account)) return false;
        if (_isSuspended(account)) return false;
        if (!_checkCompetencyRating(account)) return false;
        return true;
    }

    /* Public
    ========================================*/

    /**
     * @notice Sets the Proof of Identity contract address.
     * @param poi The address for the Proof of Identity contract.
     * @dev May revert with:
     *  /^AccessControl: account (0x[0-9a-f]{40}) is missing role (0x[0-9a-f]{64})$/
     * May revert with `SimpleStoragePOI__ZeroAddress`.
     * May emit a `POIAddressUpdated` event.
     */
    function setPOIAddress(address poi) public onlyRole(DEFAULT_ADMIN_ROLE) {
        if (poi == address(0)) revert SimpleStoragePOI__ZeroAddress();

        _proofOfIdentity = IProofOfIdentity(poi);
        emit POIAddressUpdated(poi);
    }

    /**
     * @notice Sets the Proof of Identity contract address.
     * @param threshold The competency rating threshold.
     * @dev May revert with:
     *  /^AccessControl: account (0x[0-9a-f]{40}) is missing role (0x[0-9a-f]{64})$/
     * May emit a `CompetencyRatingThresholdUpdated` event.
     */
    function setCompetencyRatingThreshold(
        uint256 threshold
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _competencyRatingThreshold = threshold;
        emit CompetencyRatingThresholdUpdated(threshold);
    }

    /* Private
    ========================================*/
    /**
     * @notice Helper function to check whether a given `account`'s competency
     * rating is valid.
     *
     * @param account The account to check.
     *
     * @return True if the check is valid, otherwise false.
     *
     * @dev For a competency rating to be valid, it must:
     * -    not be expired; and
     * -    be greater than, or equal to, the competency rating threshold.
     */
    function _checkCompetencyRating(
        address account
    ) private view returns (bool) {
        (uint256 rating, uint256 expiry, ) = _proofOfIdentity
            .getCompetencyRating(account);

        if (!_validateExpiry(expiry)) return false;
        return rating >= _competencyRatingThreshold;
    }

    /**
     * @notice Similar to `_checkCompetencyRating`, but rather than returning a
     * `bool`, will revert if the check fails.
     *
     * @param account The account to check.
     *
     * @dev For a competency rating to be valid, it must:
     * -    not be expired; and
     * -    be greater than, or equal to, the competency rating threshold.
     *
     * May revert with `SimpleStoragePOI__CompetencyRating`.
     * May revert with `SimpleStoragePOI__AttributeExpired`.
     */
    function _checkCompetencyRatingExn(address account) private view {
        (uint256 rating, uint256 expiry, ) = _proofOfIdentity
            .getCompetencyRating(account);

        if (rating < _competencyRatingThreshold) {
            revert SimpleStoragePOI__CompetencyRating(
                rating,
                _competencyRatingThreshold
            );
        }

        if (!_validateExpiry(expiry)) {
            revert SimpleStoragePOI__AttributeExpired(
                "competencyRating",
                expiry
            );
        }
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
}
