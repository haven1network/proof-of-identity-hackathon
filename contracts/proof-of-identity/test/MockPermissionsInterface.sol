// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/vendor/IAccountManager.sol";

contract MockPermissionsInterface {
    IAccountManager private _accountManager;

    constructor(address accManager) {
        _accountManager = IAccountManager(accManager);
    }

    function assignAccountRole(
        address _account,
        string calldata _orgId,
        string calldata _roleId
    ) external {
        _accountManager.assignAccountRole(_account, _orgId, _roleId, false);
    }

    function updateAccountStatus(
        string calldata _orgId,
        address _account,
        uint256 _action
    ) external {
        _accountManager.updateAccountStatus(_orgId, _account, _action);
    }
}
