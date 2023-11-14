/* IMPORT NODE MODULES
================================================== */
import {
    loadFixture,
    time,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";

/* IMPORT CONSTANTS AND UTILS
================================================== */
import { ProofOfIdTest, randIdArgs } from "../../setup";
import { SimpleStoragePOITest, simpleStoragePOIErr } from "./setup";
import { ZERO_ADDRESS, accessControlErr } from "../../../constants";
import { addTime } from "@utils/time";
import { PROOF_OF_ID_ATTRIBUTES } from "@utils/deploy/proof-of-identity";
import { generateDummyAddress } from "@utils/dummyAddresses";

/* TESTS
================================================== */
describe("Simple Storage - POI", function () {
    /* Setup
    ======================================== */
    const exp = BigInt(addTime(Date.now(), 2, "months", "sec"));
    const competencyId = PROOF_OF_ID_ATTRIBUTES.COMPETENCY_RATING.id;

    async function setup() {
        const poi = await ProofOfIdTest.create();
        const s = await SimpleStoragePOITest.create(
            poi.proofOfIdContractAddress
        );

        return { poi, s };
    }

    /* Deployment and Initialization
    ======================================== */
    describe("Deployment and Initialization", function () {
        it("Should have a deployment address", async function () {
            const { s } = await loadFixture(setup);

            expect(s.simpleStorageContractAddress).to.have.length(42);
            expect(s.simpleStorageContractAddress).to.not.equal(ZERO_ADDRESS);
        });

        it("Should correctly grant the DEFAULT_ADMIN_ROLE", async function () {
            const { s } = await loadFixture(setup);

            const role = await s.simpleStorageContract.DEFAULT_ADMIN_ROLE();
            const hasRole = await s.simpleStorageContract.hasRole(
                role,
                s.simpleStorageArgs.adminAddress
            );

            expect(hasRole).to.be.true;
        });

        it("Should correctly set the POI address", async function () {
            const { poi, s } = await loadFixture(setup);
            const poiAddress = await s.simpleStorageContract.poiAddress();
            expect(poiAddress).to.equal(poi.proofOfIdContractAddress);
        });

        it("Should correctly set the initial competency rating threshold", async function () {
            const { s } = await loadFixture(setup);
            const threshold =
                await s.simpleStorageContract.getCompetencyRatingThreshold();

            expect(threshold).to.equal(
                s.simpleStorageArgs.competencyRatingThreshold
            );
        });
    });

    /* Setting and Getting the Value
    ======================================== */
    describe("Setting and Getting the Value", function () {
        it("Should correctly set and get the value", async function () {
            const { poi, s } = await loadFixture(setup);

            const c = s.simpleStorageContract.connect(s.accounts[0]);

            const addr = s.accountAddresses[0];
            const args = randIdArgs(addr);

            await poi.issueIdentity(args);
            const compentencyTx = await poi.proofOfIdContract.setU256Attribute(
                addr,
                competencyId,
                exp,
                80n
            );
            await compentencyTx.wait();

            const newV = 5n;

            let v = await c.getValue();
            expect(v).to.equal(0n);

            const txRes = await c.setValue(newV);
            await txRes.wait();

            v = await c.getValue();
            expect(v).to.equal(newV);
        });

        it("Should revert if an account without an ID NFT tries to set the value", async function () {
            const { s } = await loadFixture(setup);

            const newV = 42n;
            const c = s.simpleStorageContract;

            await expect(c.setValue(newV)).to.be.revertedWithCustomError(
                c,
                simpleStoragePOIErr("NO_ID")
            );
        });

        it("Should revert if a suspended account tries to set the value", async function () {
            const { poi, s } = await loadFixture(setup);

            const newV = 33n;
            const addr = s.accountAddresses[0];
            const args = randIdArgs(addr);

            await poi.issueIdentity(args);

            const txRes = await poi.proofOfIdContract.suspendAccount(
                addr,
                "test reason"
            );
            await txRes.wait();

            // state now is: account has an ID NFT but they have been suspended
            const c = s.simpleStorageContract.connect(s.accounts[0]);

            await expect(c.setValue(newV)).to.be.revertedWithCustomError(
                c,
                simpleStoragePOIErr("SUSPENDED")
            );
        });

        it("Should revert if an account with an invalid competency rating tries to set the value", async function () {
            const { poi, s } = await loadFixture(setup);

            const addr = s.accountAddresses[0];
            const args = randIdArgs(addr);
            const newV = 42n;

            const c = s.simpleStorageContract.connect(s.accounts[0]);

            // issue an id but do not set the competency rating
            await poi.issueIdentity(args);

            await expect(c.setValue(newV))
                .to.be.revertedWithCustomError(
                    c,
                    simpleStoragePOIErr("COMPETENCY_RATING")
                )
                .withArgs(0n, s.simpleStorageArgs.competencyRatingThreshold);

            // establish competency rating
            const compentencyTx = await poi.proofOfIdContract.setU256Attribute(
                addr,
                competencyId,
                exp,
                80n
            );
            await compentencyTx.wait();

            await expect(c.setValue(newV)).to.not.be.reverted;

            // jump to a point in time where the account's competency rating
            // has now expired
            await time.increase(exp + 2n);

            await expect(c.setValue(newV))
                .to.be.revertedWithCustomError(
                    c,
                    simpleStoragePOIErr("ATTRIBUTE_EXPIRED")
                )
                .withArgs(PROOF_OF_ID_ATTRIBUTES.COMPETENCY_RATING.name, exp);
        });

        it("Should emit a `ValueSet` event when a value has been successfully set ", async function () {
            const { poi, s } = await loadFixture(setup);

            const addr = s.accountAddresses[0];
            const args = randIdArgs(addr);
            const newV = 42n;

            const c = s.simpleStorageContract.connect(s.accounts[0]);

            // issue id and set competency rating
            await poi.issueIdentity(args);

            const compentencyTx = await poi.proofOfIdContract.setU256Attribute(
                addr,
                competencyId,
                exp,
                80n
            );
            await compentencyTx.wait();

            await expect(c.setValue(newV))
                .to.emit(c, "ValueSet")
                .withArgs(addr, newV);
        });
    });

    /* Competency Rating Threshold
    ======================================== */
    describe("Competency Rating Threshold", function () {
        it("Should correctly get and set the competency rating threshold", async function () {
            const { s } = await loadFixture(setup);

            const c = s.simpleStorageContract;

            let threshold = await c.getCompetencyRatingThreshold();

            expect(threshold).to.equal(
                s.simpleStorageArgs.competencyRatingThreshold
            );

            const newThreshold = 50n;

            const txRes = await c.setCompetencyRatingThreshold(newThreshold);
            await txRes.wait();

            threshold = await c.getCompetencyRatingThreshold();
            expect(threshold).to.equal(newThreshold);
        });

        it("Should only allow an account with the role: DEFAULT_ADMIN_ROLE to set the competency rating threshold", async function () {
            const { s } = await loadFixture(setup);

            const c = s.simpleStorageContract.connect(s.accounts[0]);

            const err = accessControlErr("MISSING_ROLE");

            await expect(c.setCompetencyRatingThreshold(1n)).to.be.revertedWith(
                err
            );

            await expect(
                s.simpleStorageContract.setCompetencyRatingThreshold(1n)
            ).to.not.be.reverted;
        });

        it("Should emit a `CompetencyRatingThresholdUpdated` event when the threshold has been successfully set", async function () {
            const { s } = await loadFixture(setup);
            const c = s.simpleStorageContract;

            const newThreshold = 88n;
            const msg = "CompetencyRatingThresholdUpdated";

            await expect(c.setCompetencyRatingThreshold(newThreshold))
                .to.emit(c, msg)
                .withArgs(newThreshold);
        });
    });

    /* POI Address
    ======================================== */
    describe("POI Address", function () {
        it("Should correctly set and get the POI address", async function () {
            const { poi, s } = await loadFixture(setup);

            const c = s.simpleStorageContract;
            let addr = await c.poiAddress();

            expect(addr).to.equal(poi.proofOfIdContractAddress);

            const newAddr = generateDummyAddress("8182");

            const txRes = await c.setPOIAddress(newAddr);
            await txRes.wait();

            addr = await c.poiAddress();
            expect(addr).to.equal(newAddr);
        });

        it("Should only allow an account with the role: DEFAULT_ADMIN_ROLE to set the POI address", async function () {
            const { s } = await loadFixture(setup);

            const c = s.simpleStorageContract.connect(s.accounts[0]);

            const err = accessControlErr("MISSING_ROLE");
            const addr = generateDummyAddress("8231");

            await expect(c.setPOIAddress(addr)).to.be.revertedWith(err);

            await expect(s.simpleStorageContract.setPOIAddress(addr)).to.not.be
                .reverted;
        });

        it("Should revert if the zero address is passed in", async function () {
            const { s } = await loadFixture(setup);

            const c = s.simpleStorageContract;

            const err = simpleStoragePOIErr("ZERO_ADDRESS");

            await expect(
                c.setPOIAddress(ZERO_ADDRESS)
            ).to.be.revertedWithCustomError(c, err);
        });

        it("Should emit a `POIAddressUpdated` event when the threshold has been successfully set", async function () {
            const { s } = await loadFixture(setup);
            const c = s.simpleStorageContract;

            const addr = generateDummyAddress("4143");
            const msg = "POIAddressUpdated";

            await expect(c.setPOIAddress(addr)).to.emit(c, msg).withArgs(addr);
        });
    });

    /* Check Competency Rating
    ======================================== */
    describe("Check Competency Rating", function () {
        it("Should return `false` if an account does not have an ID NFT", async function () {
            const { s } = await loadFixture(setup);

            const addr = s.accountAddresses[0];

            const c = s.simpleStorageContract;

            expect(await c.canSet(addr)).to.be.false;
        });

        it("Should return `false` if an account is suspended", async function () {
            const { poi, s } = await loadFixture(setup);

            const addr = s.accountAddresses[0];
            const args = randIdArgs(addr);

            // issue id nft
            await poi.issueIdentity(args);

            let txRes = await poi.proofOfIdContract.suspendAccount(
                addr,
                "test reason"
            );
            await txRes.wait();

            // establish competency rating
            txRes = await poi.proofOfIdContract.setU256Attribute(
                addr,
                competencyId,
                exp,
                80n
            );
            await txRes.wait();

            // state now is: account has an ID NFT and a sufficiently high
            // competency rating but they have been suspended
            const c = s.simpleStorageContract;

            expect(await c.canSet(addr)).to.be.false;
        });

        it("Should return `false` if an account does not meet the competency rating threshold", async function () {
            const { poi, s } = await loadFixture(setup);

            const addr = s.accountAddresses[0];
            const args = randIdArgs(addr);

            const c = s.simpleStorageContract;

            // issue an id but do not set the competency rating
            await poi.issueIdentity(args);

            expect(await c.canSet(addr)).to.be.false;
        });

        it("Should return `true` if an account has an ID NFT, is not suspended and meets the competency rating threshold", async function () {
            const { poi, s } = await loadFixture(setup);

            const addr = s.accountAddresses[0];
            const args = randIdArgs(addr);

            const c = s.simpleStorageContract;

            // issue id nft
            await poi.issueIdentity(args);

            // establish competency rating
            const txRes = await poi.proofOfIdContract.setU256Attribute(
                addr,
                competencyId,
                exp,
                80n
            );
            await txRes.wait();

            expect(await c.canSet(addr)).to.be.true;
        });
    });
});
