# Solidity API

## IProofOfIdentity

_The interface for the ProofOfIdentity contract._

### issueIdentity

```solidity
function issueIdentity(address account, bool primaryID, string countryCode, bool proofOfLiveliness, uint256 userType, uint256[4] expiries, string uri) external
```

Issues a Proof of Identity NFT to the `account`.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The address of the account to receive the NFT. |
| primaryID | bool | Whether the account has verified a primary ID. |
| countryCode | string | The ISO 3166-1 alpha-2 country code of the account. |
| proofOfLiveliness | bool | Whether the account has completed a proof of liveliness check. |
| userType | uint256 | The account type of the user: 1 = retail. 2 = institution. |
| expiries | uint256[4] |  |
| uri | string |  |

### setStringAttribute

```solidity
function setStringAttribute(address account, uint256 id, uint256 exp, string data) external
```

Sets an attribute, the value for which is of type `string`.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The address for which the attribute should be set. |
| id | uint256 | The ID of the attribute to set. |
| exp | uint256 | The timestamp of expiry of the attribute. |
| data | string | The attribute data to set as a `string`. |

### setU256Attribute

```solidity
function setU256Attribute(address account, uint256 id, uint256 exp, uint256 data) external
```

Sets an attribute, the value for which is of type `uint256`.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The address for which the attribute should be set. |
| id | uint256 | The ID of the attribute to set. |
| exp | uint256 | The timestamp of expiry of the attribute. |
| data | uint256 | The attribute data to set as `uint256`. |

### setBoolAttribute

```solidity
function setBoolAttribute(address account, uint256 id, uint256 exp, bool data) external
```

Sets an attribute, the value for which is of type `bool`.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The address for which the attribute should be set. |
| id | uint256 | The ID of the attribute to set. |
| exp | uint256 | The timestamp of expiry of the attribute. |
| data | bool | The attribute data to set as `bool`. |

### setBytesAttribute

```solidity
function setBytesAttribute(address account, uint256 id, uint256 exp, bytes data) external
```

Sets an attribute, the value for which is of type `bytes`.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The address for which the attribute should be set. |
| id | uint256 | The ID of the attribute to set. |
| exp | uint256 | The timestamp of expiry of the attribute. |
| data | bytes | The attribute data to set as `bytes`. |

### setAttributeCount

```solidity
function setAttributeCount(uint256 count) external
```

Sets the attribute count.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| count | uint256 | The new count. |

### addAttribute

```solidity
function addAttribute(string name, enum SupportedAttributeType attrType) external
```

Adds an attribute to the contract.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| name | string | The attribute's name. |
| attrType | enum SupportedAttributeType | The type of the attribute. |

### setTokenURI

```solidity
function setTokenURI(address account, uint256 tokenId, string tokenUri) external
```

Updates the URI of a token.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | the target account of the tokenUri to update. |
| tokenId | uint256 |  |
| tokenUri | string | the URI data to update for the token Id. |

### suspendAccount

```solidity
function suspendAccount(address account, string reason) external
```

Suspends an account.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The account to suspend. |
| reason | string | The reason for the suspension. |

### unsuspendAccount

```solidity
function unsuspendAccount(address account) external
```

Unsuspends an account.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The account to unsuspend. |

### getPrimaryID

```solidity
function getPrimaryID(address account) external view returns (bool, uint256, uint256)
```

Returns a tuple containing whether or not a user has validated
their primary ID, the expiry of the attribute and the last time it was
updated.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The address of the account for which the attribute is fetched. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | A tuple containing whether the account's primary ID has been validated, the expiry of the attribute and the last time it was updated. Returned in the following form: `(bool, uint256, uint256)` |
| [1] | uint256 |  |
| [2] | uint256 |  |

### getCountryCode

```solidity
function getCountryCode(address account) external view returns (string, uint256, uint256)
```

Returns a tuple containing a user's country code (lowercase), the
expiry of the attribute and the last time it was updated.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The address of the account for which the attribute is fetched. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | A tuple containing a user's country code (lowercase), the expiry of the attribute and the last time it was updated. Returned in the following form: `(string memory, uint256, uint256)` |
| [1] | uint256 |  |
| [2] | uint256 |  |

### getProofOfLiveliness

```solidity
function getProofOfLiveliness(address account) external view returns (bool, uint256, uint256)
```

Returns a tuple containing whether a user's proof of liveliness
check has been completed, the expiry of the attribute and the last time
it was updated.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The address of the account for which the attribute is fetched. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | A tuple containing whether a user's proof of liveliness check has been completed, the expiry of the attribute and the last time it was updated. Returned in the following form: `(bool, uint256, uint256)` |
| [1] | uint256 |  |
| [2] | uint256 |  |

### getUserType

```solidity
function getUserType(address account) external view returns (uint256, uint256, uint256)
```

Returns a tuple containing a user's account type, the expiry of
the attribute and the last time it was updated.
1 = Retail
2 = Institution

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The address of the account for which the attribute is fetched. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | A tuple containing a user's account type, the expiry of the attribute and the last time it was updated. Returned in the following form: `(uint256, uint256, uint256)` |
| [1] | uint256 |  |
| [2] | uint256 |  |

### getCompetencyRating

```solidity
function getCompetencyRating(address account) external view returns (uint256, uint256, uint256)
```

Returns a tuple containing a user's competency rating, the expiry
of the attribute and the last time it was updated.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The address of the account for which the attribute is fetched. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | A tuple containing a user's competency rating, the expiry of the attribute and the last time it was updated. Returned in the following form: `(uint256, uint256, uint256)` |
| [1] | uint256 |  |
| [2] | uint256 |  |

### getStringAttribute

```solidity
function getStringAttribute(uint256 id, address account) external view returns (string, uint256, uint256)
```

Returns a tuple containing the string attribute, the expiry of
the attribute and the last time it was updated. Note that if an invalid ID
is passed in, the call with revert.
If an address for which the attribute has not yet been set is passed in,
the default `("", 0, 0)` case will be returned.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| id | uint256 | The attribute ID to fetch. |
| account | address | The address of the account for which the attribute is fetched. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | A tuple containing the string attribute, the expiry of the attribute and the last time it was updated. Returned in the following form: `(string memory, uint256, uint256)` |
| [1] | uint256 |  |
| [2] | uint256 |  |

### getU256Attribute

```solidity
function getU256Attribute(uint256 id, address account) external view returns (uint256, uint256, uint256)
```

Returns a tuple containing the uint256 attribute, the expiry of
the attribute and the last time it was updated. Note that if an invalid ID
is passed in, the call with revert.
If an address for which the attribute has not yet been set is passed in,
the default `(0, 0, 0)` case will be returned.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| id | uint256 | The attribute ID to fetch. |
| account | address | The address of the account for which the attribute is fetched. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | A tuple containing the uint256 attribute, the expiry of the attribute and the last time it was updated. Returned in the following form: `(uint256, uint256, uint256)` |
| [1] | uint256 |  |
| [2] | uint256 |  |

### getBoolAttribute

```solidity
function getBoolAttribute(uint256 id, address account) external view returns (bool, uint256, uint256)
```

Returns a tuple containing the bool attribute, the expiry of
the attribute and the last time it was updated. Note that if an invalid ID
is passed in, the call with revert.
If an address for which the attribute has not yet been set is passed in,
the default `(false, 0, 0)` case will be returned.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| id | uint256 | The attribute ID to fetch. |
| account | address | The address of the account for which the attribute is fetched. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | A tuple containing the uint256 attribute, the expiry of the attribute and the last time it was updated. Returned in the following form: `(bool, uint256, uint256)` |
| [1] | uint256 |  |
| [2] | uint256 |  |

### getBytesAttribute

```solidity
function getBytesAttribute(uint256 id, address account) external view returns (bytes, uint256, uint256)
```

Returns a tuple containing the bytes attribute, the expiry of
the attribute and the last time it was updated. Note that if an invalid ID
is passed in, the call with revert.
If an address for which the attribute has not yet been set is passed in,
the default `("0x", 0, 0)` case will be returned.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| id | uint256 | The attribute ID to fetch. |
| account | address | The address of the account for which the attribute is fetched. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes | A tuple containing the uint256 attribute, the expiry of the attribute and the last time it was updated. Returned in the following form: `(bytes, uint256, uint256)` |
| [1] | uint256 |  |
| [2] | uint256 |  |

### getAttributeName

```solidity
function getAttributeName(uint256 id) external view returns (string)
```

Helper function that returns an attribute's name. Note that
it will return an empty string (`""`) if the attribute ID provided is
invalid.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| id | uint256 | The ID of the attribute for which the name is fetched. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | The name of the attribute. |

### isSuspended

```solidity
function isSuspended(address account) external view returns (bool)
```

Returns if a given account is suspended.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The account the check. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | True if suspended, false otherwise. |

### tokenID

```solidity
function tokenID(address account) external view returns (uint256)
```

Returns an account's token ID.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The address for which the token ID should be retrieved. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The token ID. |

### tokenIDCounter

```solidity
function tokenIDCounter() external view returns (uint256)
```

Returns the current token ID counter value.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The token ID counter value. |

### attributeCount

```solidity
function attributeCount() external view returns (uint256)
```

Returns amount of attributes currently tracked by the contract.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The amount of attributes currently tracked by the contract. |

### getAttributeType

```solidity
function getAttributeType(uint256 id) external view returns (string)
```

Helper function that returns an attribute's type.
E.g., 0 (primaryID) => "bool"
E.g., 1 (countryCode) => "string"

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| id | uint256 | The ID of the attribute for which the type is fetched. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | The type of the attribute. |

### balanceOf

```solidity
function balanceOf(address owner) external view returns (uint256)
```

Returns the number of tokens in `owner`'s account.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| owner | address | The address of the owner whose balance will be checked. |

