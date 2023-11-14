# Examples
This directory contains two example contracts that interact with the `ProofOfIdentity` contract.

-   `AuctionPOI.sol`:  an implementation of an auction for an NFT. It permissions the auction based on the `userType` of an account.
-   `SimpleStoragePOI.sol`: an implementation of `SimpleStorage` that permissions accounts based on their `competencyRating`.

Note that while both contracts utilise many Solidity best practices, they are purely for demonstrations purposes only. For example, in production the:
-   `bid` function in `AuctionPOI.sol:280` should include a reentrancy guard; and
-   transfer of H1 at `AuctionPOI.sol:454` and `AuctionPOI.sol:468` should not occur optimistically in most circumstances.

Both contracts explicitly check for the presence of an account's `ID NFT`, as well as their suspended status.
In practice, these checks would both be redundant on the Haven1 network as the network would prevent anyone without and `ID NFT` or with a suspended account from transacting. However, for demonstration purposes, they are included here.

Example tests for both contracts can be found in `test/proof-of-identity/examples`
