/* IMPORT NODE MODULES
================================================== */
import {
    loadFixture,
    time,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ethers } from "hardhat";
import { expect } from "chai";

/* IMPORT CONSTANTS AND UTILS
================================================== */
import {
    type IssueIdArgs,
    ProofOfIdTest,
    userType,
    UserTypeKey,
} from "../../setup";
import { AuctionPOITest, auctionPOIErr, getAuctionType } from "./setup";
import { ZERO_ADDRESS } from "../../../constants";
import { addTime } from "@utils/time";
import { getH1Balance, parseH1 } from "@utils/token";
import { PROOF_OF_ID_ATTRIBUTES } from "@utils/deploy/proof-of-identity";
import { tsFromTxRec } from "@utils/transaction";

/* TESTS
================================================== */
describe("Auction - POI", function () {
    /* Setup
    ======================================== */
    const exp = addTime(Date.now(), 2, "years", "sec");

    function newArgs(addr: string, userTypeKey: UserTypeKey): IssueIdArgs {
        return {
            account: addr,
            userType: userType(userTypeKey),
            proofOfLiveliness: true,
            primaryID: true,
            countryCode: "sg",
            expiries: [exp, exp, exp, exp],
            tokenURI: "test-uri",
        };
    }

    async function setup() {
        const poi = await ProofOfIdTest.create();
        const a = await AuctionPOITest.create(poi.proofOfIdContractAddress);

        return { poi, a };
    }

    /* Deployment and Initialization
    ======================================== */
    describe("Deployment and Initialization", function () {
        it("Should have a deployment address", async function () {
            const { a } = await loadFixture(setup);

            expect(a.auctionContractAddress).to.have.length(42);
            expect(a.auctionContractAddress).to.not.equal(ZERO_ADDRESS);
        });

        it("Should correctly set the POI address", async function () {
            const { poi, a } = await loadFixture(setup);
            const poiAddress = await a.auctionContract.poiAddress();
            expect(poiAddress).to.equal(poi.proofOfIdContractAddress);
        });

        it("Should correctly set the auction type", async function () {
            const { a } = await loadFixture(setup);
            const auctionType = await a.auctionContract.getAuctionType();
            expect(auctionType).to.equal(a.auctionArgs.auctionType);
        });

        it("Should correctly set the auction length", async function () {
            const { a } = await loadFixture(setup);
            const auctionLength = await a.auctionContract.getAuctionLength();
            expect(auctionLength).to.equal(a.auctionArgs.auctionLength);
        });

        it("Should correctly set the starting bid", async function () {
            const { a } = await loadFixture(setup);
            const startingBid = await a.auctionContract.getHighestBid();
            expect(startingBid).to.equal(a.auctionArgs.startingBid);
        });

        it("Should correctly set the prize NFT address and ID", async function () {
            const { a } = await loadFixture(setup);
            const [addr, id] = await a.auctionContract.getNFT();
            expect(addr).to.equal(a.auctionArgs.nftAddress);
            expect(id).to.equal(a.auctionArgs.nftId);
        });

        it("Should fail to deploy if an auction type of zero (0) is supplied ", async function () {
            const { a } = await loadFixture(setup);

            const auctionType = 0;
            const args = { ...a.auctionArgs, auctionType };
            const err = auctionPOIErr("INVALID_AUCTION_TYPE");

            const f = await ethers.getContractFactory("AuctionPOI");

            await expect(
                f.deploy(
                    args.proofOfIdentityAddress,
                    args.auctionType,
                    args.auctionLength,
                    args.startingBid,
                    args.nftAddress,
                    args.nftId
                )
            )
                .to.be.revertedWithCustomError(f, err)
                .withArgs(0);
        });

        it("Should fail to deploy if an auction type greater than three (3) is supplied ", async function () {
            const { a } = await loadFixture(setup);

            const auctionType = 4;
            const args = { ...a.auctionArgs, auctionType };
            const err = auctionPOIErr("INVALID_AUCTION_TYPE");

            const f = await ethers.getContractFactory("AuctionPOI");

            await expect(
                f.deploy(
                    args.proofOfIdentityAddress,
                    args.auctionType,
                    args.auctionLength,
                    args.startingBid,
                    args.nftAddress,
                    args.nftId
                )
            )
                .to.be.revertedWithCustomError(f, err)
                .withArgs(auctionType);
        });

        it("Should fail to deploy if an auction length of zero (0) is supplied", async function () {
            const { a } = await loadFixture(setup);

            const auctionLength = 0;
            const args = { ...a.auctionArgs, auctionLength };
            const err = auctionPOIErr("INVALID_AUCTION_LENGTH");

            const f = await ethers.getContractFactory("AuctionPOI");

            await expect(
                f.deploy(
                    args.proofOfIdentityAddress,
                    args.auctionType,
                    args.auctionLength,
                    args.startingBid,
                    args.nftAddress,
                    args.nftId
                )
            )
                .to.be.revertedWithCustomError(f, err)
                .withArgs(auctionLength);
        });

        it("Should fail to deploy if the zero address is supplied for the Proof of Identity address", async function () {
            const { a } = await loadFixture(setup);

            const args = {
                ...a.auctionArgs,
                proofOfIdentityAddress: ZERO_ADDRESS,
            };
            const err = auctionPOIErr("ZERO_ADDRESS");

            const f = await ethers.getContractFactory("AuctionPOI");

            await expect(
                f.deploy(
                    args.proofOfIdentityAddress,
                    args.auctionType,
                    args.auctionLength,
                    args.startingBid,
                    args.nftAddress,
                    args.nftId
                )
            ).to.be.revertedWithCustomError(f, err);
        });
    });

    /* Placing Bids
    ======================================== */
    describe("Placing Bids", function () {
        it("Should correctly place a bid", async function () {
            const { poi, a } = await loadFixture(setup);

            const c = a.auctionContract.connect(a.accounts[0]);
            const addr = a.accountAddresses[0];
            const args = newArgs(addr, "RETAIL");
            const bid = parseH1("15");

            await poi.issueIdentity(args);

            let txRes = await a.auctionContract.startAuction();
            await txRes.wait();

            const hasStarted = await a.auctionContract.hasStarted();
            expect(hasStarted).to.be.true;

            let highestBid = await a.auctionContract.getHighestBid();
            expect(highestBid).to.equal(a.auctionArgs.startingBid);

            let highestBidder = await a.auctionContract.getHighestBidder();
            expect(highestBidder).to.equal(ZERO_ADDRESS);

            txRes = await c.bid({ value: bid });
            await txRes.wait();

            highestBid = await a.auctionContract.getHighestBid();
            expect(highestBid).to.equal(bid);

            highestBidder = await a.auctionContract.getHighestBidder();
            expect(highestBidder).to.equal(addr);
        });

        it("Should revert if the auction has not started", async function () {
            const { poi, a } = await loadFixture(setup);

            const c = a.auctionContract.connect(a.accounts[0]);
            const addr = a.accountAddresses[0];
            const args = newArgs(addr, "RETAIL");
            const bid = parseH1("20");
            const err = auctionPOIErr("NOT_STARTED");

            await poi.issueIdentity(args);

            const hasStarted = await a.auctionContract.hasStarted();
            expect(hasStarted).to.be.false;

            await expect(c.bid({ value: bid })).to.be.revertedWithCustomError(
                c,
                err
            );
        });

        it("Should revert if the auction has finished", async function () {
            const { poi, a } = await loadFixture(setup);

            const c = a.auctionContract.connect(a.accounts[0]);
            const addr = a.accountAddresses[0];
            const args = newArgs(addr, "RETAIL");
            const bid = parseH1("100");
            const err = auctionPOIErr("FINISHED");

            await poi.issueIdentity(args);

            const txRes = await a.auctionContract.startAuction();
            await txRes.wait();
            await time.increase(a.auctionArgs.auctionLength + 1);

            const hasFinished = await c.hasFinished();
            expect(hasFinished).to.be.true;

            await expect(c.bid({ value: bid })).to.be.revertedWithCustomError(
                c,
                err
            );
        });

        it("Should revert if the bid is too low", async function () {
            const { poi, a } = await loadFixture(setup);

            const c = a.auctionContract.connect(a.accounts[0]);
            const addr = a.accountAddresses[0];
            const args = newArgs(addr, "RETAIL");
            const bid = parseH1("1");
            const err = auctionPOIErr("BID_TOO_LOW");

            await poi.issueIdentity(args);

            const txRes = await a.auctionContract.startAuction();
            await txRes.wait();

            await expect(c.bid({ value: bid })).to.be.revertedWithCustomError(
                c,
                err
            );
        });

        it("Should revert if the new bid is the same as the current highest bid", async function () {
            const { poi, a } = await loadFixture(setup);

            const c = a.auctionContract.connect(a.accounts[0]);

            const addr = a.accountAddresses[0];
            const args = newArgs(addr, "RETAIL");
            const err = auctionPOIErr("BID_TOO_LOW");

            await poi.issueIdentity(args);

            let txRes = await a.auctionContract.startAuction();
            await txRes.wait();

            await expect(
                c.bid({ value: a.auctionArgs.startingBid })
            ).to.be.revertedWithCustomError(c, err);
        });

        it("Should not allow the current highest bidder to outbid themselves / raise thier bid", async function () {
            const { poi, a } = await loadFixture(setup);

            const c = a.auctionContract.connect(a.accounts[0]);

            const addr = a.accountAddresses[0];
            const args = newArgs(addr, "RETAIL");
            const bid1 = parseH1("15");
            const bid2 = parseH1("16");
            const err = auctionPOIErr("ALREADY_HIGHEST");

            await poi.issueIdentity(args);

            let txRes = await a.auctionContract.startAuction();
            await txRes.wait();

            txRes = await c.bid({ value: bid1 });
            await txRes.wait();

            await expect(c.bid({ value: bid2 })).to.revertedWithCustomError(
                c,
                err
            );
        });

        it("Should refund the previous highest bid to the previous highest bidder upon a new successful bid", async function () {
            const { poi, a } = await loadFixture(setup);

            const c1 = a.auctionContract.connect(a.accounts[0]);
            const c2 = a.auctionContract.connect(a.accounts[1]);

            const addr1 = a.accountAddresses[0];
            const addr2 = a.accountAddresses[1];

            const args1 = newArgs(addr1, "RETAIL");
            const args2 = newArgs(addr2, "RETAIL");

            await poi.issueIdentity(args1);
            await poi.issueIdentity(args2);

            const bid1 = parseH1("15");
            const bid2 = parseH1("16");

            let txRes = await a.auctionContract.startAuction();
            await txRes.wait();

            txRes = await c1.bid({ value: bid1 });
            await txRes.wait();

            const addr1BalBefore = await getH1Balance(addr1);

            txRes = await c2.bid({ value: bid2 });
            await txRes.wait();

            const addr1BalAfter = await getH1Balance(addr1);
            expect(addr1BalAfter).to.equal(addr1BalBefore + bid1);
        });

        it("Should correctly update the highest bidder and highest bid", async function () {
            const { poi, a } = await loadFixture(setup);

            const c = a.auctionContract.connect(a.accounts[0]);

            const addr = a.accountAddresses[0];
            const args = newArgs(addr, "RETAIL");
            const bid = parseH1("81");

            await poi.issueIdentity(args);

            let txRes = await a.auctionContract.startAuction();
            await txRes.wait();

            const prevBidder = await c.getHighestBidder();
            const prevBid = await c.getHighestBid();

            expect(prevBidder).to.equal(ZERO_ADDRESS);
            expect(prevBid).to.equal(a.auctionArgs.startingBid);

            txRes = await c.bid({ value: bid });
            await txRes.wait();

            const currBidder = await c.getHighestBidder();
            const currBid = await c.getHighestBid();

            expect(currBidder).to.equal(addr);
            expect(currBid).to.equal(bid);
        });

        it("Should emit a `BidPlaced` event upon successfully placing a bid", async function () {
            const { poi, a } = await loadFixture(setup);

            const c = a.auctionContract.connect(a.accounts[0]);

            const addr = a.accountAddresses[0];
            const args = newArgs(addr, "RETAIL");
            const bid = parseH1("81");
            const msg = "BidPlaced";

            await poi.issueIdentity(args);

            const txRes = await a.auctionContract.startAuction();
            await txRes.wait();

            await expect(c.bid({ value: bid }))
                .to.emit(c, msg)
                .withArgs(addr, bid);
        });

        it("Should not allow an account without an ID NFT to bid", async function () {
            const { a } = await loadFixture(setup);

            const c = a.auctionContract.connect(a.accounts[0]);

            const bid = parseH1("19");
            const err = auctionPOIErr("NO_ID");

            let txRes = await a.auctionContract.startAuction();
            await txRes.wait();

            await expect(c.bid({ value: bid })).to.be.revertedWithCustomError(
                c,
                err
            );
        });

        it("Should not allow an account that is suspended to bid", async function () {
            const { poi, a } = await loadFixture(setup);

            const c = a.auctionContract.connect(a.accounts[0]);

            const addr = a.accountAddresses[0];
            const args = newArgs(addr, "RETAIL");
            const reason = "test-reason";
            const err = auctionPOIErr("SUSPENDED");
            const bid = parseH1("22");

            await poi.issueIdentity(args);

            let txRes = await a.auctionContract.startAuction();
            await txRes.wait();

            txRes = await poi.proofOfIdContract.suspendAccount(addr, reason);
            await txRes.wait();

            await expect(c.bid({ value: bid })).to.revertedWithCustomError(
                c,
                err
            );
        });

        it("Should not allow an account with an expired account type property to bid", async function () {
            const { poi, a } = await loadFixture(setup);

            const c = a.auctionContract.connect(a.accounts[0]);

            const addr = a.accountAddresses[0];
            const args = newArgs(addr, "RETAIL");
            const exp = args.expiries[PROOF_OF_ID_ATTRIBUTES.USER_TYPE.id];
            const attr = PROOF_OF_ID_ATTRIBUTES.USER_TYPE.name;
            const err = auctionPOIErr("ATTRIBUTE_EXPIRED");
            const bid = parseH1("22");

            await poi.issueIdentity(args);

            let txRes = await a.auctionContract.startAuction();
            await txRes.wait();

            await time.increase(exp);

            await expect(c.bid({ value: bid }))
                .to.be.revertedWithCustomError(c, err)
                .withArgs(attr, exp);
        });

        it("Should not allow an account of the wrong account type to bid", async function () {
            const { poi, a } = await loadFixture(setup);

            const institutionOnly = await a.deployAuction({
                ...a.auctionArgs,
                auctionType: getAuctionType("INSTITUTION"),
            });

            const c = institutionOnly.connect(a.accounts[0]);

            const addr = a.accountAddresses[0];
            const args = newArgs(addr, "RETAIL");
            const err = auctionPOIErr("USER_TYPE");
            const bid = parseH1("90");

            await poi.issueIdentity(args);

            let txRes = await a.nftContract.approve(
                await institutionOnly.getAddress(),
                a.auctionArgs.nftId
            );
            await txRes.wait();

            txRes = await institutionOnly.startAuction();
            await txRes.wait();

            await expect(c.bid({ value: bid }))
                .to.revertedWithCustomError(c, err)
                .withArgs(userType("RETAIL"), userType("INSTITUTION"));
        });
    });

    /* Starting an Auction
    ======================================== */
    describe("Starting an Auction", function () {
        it("Should only allow the owner to start an auction", async function () {
            const { a } = await loadFixture(setup);

            const c = a.auctionContract.connect(a.accounts[0]);

            await expect(c.startAuction()).to.be.reverted;
            await expect(a.auctionContract.startAuction()).to.not.be.reverted;
        });

        it("Should revert if the auction has already been started", async function () {
            const { a } = await loadFixture(setup);

            const c = a.auctionContract;
            const err = auctionPOIErr("ACTIVE");

            const txRes = await c.startAuction();
            txRes.wait();

            await expect(c.startAuction()).to.be.revertedWithCustomError(
                c,
                err
            );
        });

        it("Should transfer in the prize NFT", async function () {
            const { a } = await loadFixture(setup);

            const c = a.auctionContract;

            const txRes = await c.startAuction();
            txRes.wait();

            const bal = await a.nftContract.balanceOf(a.auctionContractAddress);
            expect(bal).to.equal(1);
        });

        it("Should emit an `AuctionStarted` event", async function () {
            const { a } = await loadFixture(setup);

            const c = a.auctionContract;
            const msg = "AuctionStarted";

            await expect(c.startAuction()).to.emit(c, msg);
        });
    });

    /* Ending an Auction
    ======================================== */
    describe("Ending an Auction", function () {
        it("Should revert if the auction has not started", async function () {
            const { a } = await loadFixture(setup);

            const c = a.auctionContract;
            const err = auctionPOIErr("NOT_STARTED");

            await expect(c.endAuction()).to.be.revertedWithCustomError(c, err);
        });

        it("Should revert if called before the auction length has been met", async function () {
            const { a } = await loadFixture(setup);

            const c = a.auctionContract;
            const err = auctionPOIErr("ACTIVE");

            const txRes = await c.startAuction();
            txRes.wait();

            await expect(c.endAuction()).to.be.revertedWithCustomError(c, err);
        });

        it("Should revert if the auction is already finished", async function () {
            const { a } = await loadFixture(setup);

            const c = a.auctionContract;
            const err = auctionPOIErr("FINISHED");

            let txRes = await c.startAuction();
            txRes.wait();

            await time.increase(a.auctionArgs.auctionLength);

            txRes = await c.endAuction();
            await txRes.wait();

            await expect(c.endAuction()).to.be.revertedWithCustomError(c, err);
        });

        it("Should transfer the prize NFT to the winner", async function () {
            const { poi, a } = await loadFixture(setup);

            const c = a.auctionContract.connect(a.accounts[0]);

            const addr = a.accountAddresses[0];
            const args = newArgs(addr, "RETAIL");
            const bid = parseH1("22");

            await poi.issueIdentity(args);

            let txRes = await a.auctionContract.startAuction();
            await txRes.wait();

            txRes = await c.bid({ value: bid });
            await txRes.wait();

            await time.increase(a.auctionArgs.auctionLength);

            const balBefore = await a.nftContract.balanceOf(addr);
            expect(balBefore).to.equal(0);

            txRes = await c.endAuction();
            await txRes.wait();

            const balAfter = await a.nftContract.balanceOf(addr);
            expect(balAfter).to.equal(1);
        });

        it("Should transfer the contract balance to the owner", async function () {
            const { poi, a } = await loadFixture(setup);

            const c = a.auctionContract.connect(a.accounts[0]);

            const addr = a.accountAddresses[0];
            const args = newArgs(addr, "RETAIL");
            const bid = parseH1("22");

            await poi.issueIdentity(args);

            let txRes = await a.auctionContract.startAuction();
            await txRes.wait();

            txRes = await c.bid({ value: bid });
            await txRes.wait();

            await time.increase(a.auctionArgs.auctionLength);

            const balBefore = await getH1Balance(a.foundationAddress);

            const contractBal = await getH1Balance(a.auctionContractAddress);
            expect(contractBal).to.equal(bid);

            txRes = await c.endAuction();
            await txRes.wait();

            const balAfter = await getH1Balance(a.foundationAddress);
            const expected = balBefore + contractBal;

            expect(balAfter).to.equal(expected);
        });

        it("Should emit an `NFTSent` event when the NFT is transferred to the winner", async function () {
            const { poi, a } = await loadFixture(setup);

            const c = a.auctionContract.connect(a.accounts[0]);

            const addr = a.accountAddresses[0];
            const args = newArgs(addr, "RETAIL");
            const bid = parseH1("22");
            const msg = "NFTSent";

            await poi.issueIdentity(args);

            let txRes = await a.auctionContract.startAuction();
            await txRes.wait();

            txRes = await c.bid({ value: bid });
            await txRes.wait();

            await time.increase(a.auctionArgs.auctionLength);

            expect(c.endAuction).to.emit(c, msg).withArgs(addr, bid);
        });
    });

    /* Account Eligibility
    ======================================== */
    describe("Account Eligibility", function () {
        it("Should return false if the account does not have an ID NFT", async function () {
            const { a } = await loadFixture(setup);

            const c = a.auctionContract;
            const addr = a.accountAddresses[0];

            let txRes = await c.startAuction();
            await txRes.wait();

            const isEligible = await c.accountEligible(addr);
            expect(isEligible).to.be.false;
        });

        it("Should return false if the account is suspended", async function () {
            const { poi, a } = await loadFixture(setup);

            const c = a.auctionContract;
            const addr = a.accountAddresses[0];
            const args = newArgs(addr, "RETAIL");
            const reason = "test-reason";

            await poi.issueIdentity(args);

            let txRes = await c.startAuction();
            await txRes.wait();

            txRes = await poi.proofOfIdContract.suspendAccount(addr, reason);
            await txRes.wait();

            const isEligible = await c.accountEligible(addr);
            expect(isEligible).to.be.false;
        });

        it("Should return false if the account is not of the requisite user type", async function () {
            const { poi, a } = await loadFixture(setup);

            const institutionOnly = await a.deployAuction({
                ...a.auctionArgs,
                auctionType: getAuctionType("INSTITUTION"),
            });

            const addr = a.accountAddresses[0];
            const args = newArgs(addr, "RETAIL");

            await poi.issueIdentity(args);

            let txRes = await a.nftContract.approve(
                await institutionOnly.getAddress(),
                a.auctionArgs.nftId
            );
            await txRes.wait();

            txRes = await institutionOnly.startAuction();
            await txRes.wait();

            const isEligible = await institutionOnly.accountEligible(addr);
            expect(isEligible).to.be.false;
        });

        it("Should return false if the account is has an expired user type attribute", async function () {
            const { poi, a } = await loadFixture(setup);

            const c = a.auctionContract;

            const addr = a.accountAddresses[0];
            const args = newArgs(addr, "RETAIL");
            const exp = args.expiries[PROOF_OF_ID_ATTRIBUTES.USER_TYPE.id];

            await poi.issueIdentity(args);

            let txRes = await c.startAuction();
            await txRes.wait();

            await time.increase(exp);

            const isEligible = await c.accountEligible(addr);
            expect(isEligible).to.be.false;
        });

        it("Should return true if the account is eligible", async function () {
            const { poi, a } = await loadFixture(setup);

            const c = a.auctionContract;
            const addr = a.accountAddresses[0];
            const args = newArgs(addr, "RETAIL");

            await poi.issueIdentity(args);

            let txRes = await c.startAuction();
            await txRes.wait();

            const isEligible = await c.accountEligible(addr);
            expect(isEligible).to.be.true;
        });
    });

    /* Misc
    ======================================== */
    describe("Misc", function () {
        it("Should correctly get the in progress and finished state", async function () {
            const { a } = await loadFixture(setup);

            const c = a.auctionContract;

            let txRes = await c.startAuction();
            await txRes.wait();

            let inProgress = await c.inProgress();
            expect(inProgress).to.be.true;

            let hasFinished = await c.hasFinished();
            expect(hasFinished).to.be.false;

            await time.increase(a.auctionArgs.auctionLength);

            txRes = await c.endAuction();
            await txRes.wait();

            inProgress = await c.inProgress();
            expect(inProgress).to.be.false;

            hasFinished = await c.hasFinished();
            expect(hasFinished).to.be.true;
        });

        it("Should correctly get the finish time", async function () {
            const { a } = await loadFixture(setup);

            const c = a.auctionContract;

            let txRes = await c.startAuction();
            const txRec = await txRes.wait();

            const ts = await tsFromTxRec(txRec);

            const finishTime = await c.getFinishTime();
            const expected = ts + a.auctionArgs.auctionLength;

            expect(finishTime).to.equal(expected);
        });
    });
});
