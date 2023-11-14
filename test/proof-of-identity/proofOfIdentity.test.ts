/* IMPORT NODE MODULES
================================================== */
import { ethers } from "hardhat";
import {
    loadFixture,
    time,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";

/* IMPORT TYPES
================================================== */
import { UpgradedPOI } from "@typechain/index";

/* IMPORT CONSTANTS AND UTILS
================================================== */
import { type IssueIdArgs, ProofOfIdTest, idErr, randIdArgs } from "./setup";
import { generateDummyAddress } from "@utils/dummyAddresses";
import {
    PROOF_OF_ID_ATTRIBUTES,
    SUPPORTED_ID_ATTRIBUTE_TYPES,
    upgradeProofOfIdentity,
} from "@utils/deploy/proof-of-identity";
import { addTime } from "@utils/time";
import { tsFromTxRec } from "@utils/transaction";
import {
    ERC_721_INTERFACE_ID,
    ZERO_ADDRESS,
    accessControlErr,
    initialiazbleErr,
} from "../constants";
import { randomNumber } from "@utils/random";

/* TESTS
================================================== */
describe("Proof of Identity", function () {
    /* Setup
    ======================================== */
    async function setup() {
        return await ProofOfIdTest.create();
    }

    /* Deployment and Initialization
    ======================================== */
    describe("Deployment and Initialization", function () {
        it("Should have a deployment address", async function () {
            const t = await loadFixture(setup);
            expect(t.proofOfIdContractAddress).to.have.length(42);
            expect(t.proofOfIdContractAddress).to.not.equal(ZERO_ADDRESS);
        });

        it("Should assign the Haven1 Foundation the role: DEFAULT_ADMIN_ROLE", async function () {
            const t = await loadFixture(setup);

            const defaultAdmin = await t.proofOfIdContract.DEFAULT_ADMIN_ROLE();
            const hasRole = await t.proofOfIdContract.hasRole(
                defaultAdmin,
                t.foundationAddress
            );

            expect(hasRole).to.equal(true);
        });

        it("Should assign the Haven1 Foundation the role: OPERATOR_ROLE", async function () {
            const t = await loadFixture(setup);

            const role = await t.proofOfIdContract.OPERATOR_ROLE();
            const hasRole = await t.proofOfIdContract.hasRole(
                role,
                t.foundationAddress
            );

            expect(hasRole).to.equal(true);
        });

        it("Should assign the network operator the role: OPERATOR_ROLE", async function () {
            const t = await loadFixture(setup);

            const role = await t.proofOfIdContract.OPERATOR_ROLE();
            const hasRole = await t.proofOfIdContract.hasRole(
                role,
                t.networkOperatorAddress
            );

            expect(hasRole).to.equal(true);
        });

        it("Should not allow initialize to be called a second time", async function () {
            const { proofOfIdContract: c, proofOfIdArgs: a } =
                await loadFixture(setup);

            const err = initialiazbleErr("ALREADY_INITIALIZED");

            const init = c.initialize(
                a.foundationAddress,
                a.networkOperatorAddress,
                a.permissionsInterfaceAddress,
                a.accountManagerAddress
            );

            await expect(init).to.be.revertedWith(err);
        });
    });

    /* Adding New Attributes
    ======================================== */
    describe("Adding New Attributes", function () {
        const attrName = "accredited";
        const attrType = SUPPORTED_ID_ATTRIBUTE_TYPES.BOOL;
        const expectedId = 5n;

        const a = generateDummyAddress("9182");
        const args = randIdArgs(a);
        const exp = BigInt(addTime(Date.now(), 2, "months", "sec"));

        it("Should correctly add an attribute", async function () {
            const t = await loadFixture(setup);

            let txRes = await t.proofOfIdContract.addAttribute(
                attrName,
                attrType.id
            );

            await txRes.wait();

            await t.issueIdentity(args);

            // if the new attribute was not set correctly, this call will fail
            // due to its _validateID check.
            txRes = await t.proofOfIdContract.setBoolAttribute(
                a,
                expectedId,
                exp,
                true
            );
            const txRec = await txRes.wait();

            const ts = BigInt(await tsFromTxRec(txRec));

            // Confirm that the new
            const boolAttr = await t.proofOfIdContract.getBoolAttribute(
                expectedId,
                a
            );

            expect(boolAttr).to.deep.equal([true, exp, ts]);
        });

        it("Should use the current attribute count as the new attribute ID", async function () {
            const t = await loadFixture(setup);

            const currCount = await t.proofOfIdContract.attributeCount();
            expect(currCount).to.equal(5n);

            const txRes = await t.proofOfIdContract.addAttribute(
                attrName,
                attrType.id
            );

            await txRes.wait();

            const addedName = await t.proofOfIdContract.getAttributeName(
                currCount
            );

            const addedType = await t.proofOfIdContract.getAttributeType(
                currCount
            );

            expect(addedName).to.equal(attrName);
            expect(addedType).to.equal(attrType.str);
        });

        it("Should correctly increment the attribute count", async function () {
            const t = await loadFixture(setup);

            const currCount = await t.proofOfIdContract.attributeCount();
            expect(currCount).to.equal(5n);

            const txRes = await t.proofOfIdContract.addAttribute(
                attrName,
                attrType.id
            );

            await txRes.wait();

            const newCount = await t.proofOfIdContract.attributeCount();
            expect(newCount).to.equal(6n);
        });

        it("Should correctly set the new attribute's name", async function () {
            const t = await loadFixture(setup);

            let txRes = await t.proofOfIdContract.addAttribute(
                attrName,
                attrType.id
            );

            await txRes.wait();

            const name = await t.proofOfIdContract.getAttributeName(expectedId);

            expect(name).to.equal(attrName);
        });

        it("Should correctly set the new attribute's type", async function () {
            const t = await loadFixture(setup);

            let txRes = await t.proofOfIdContract.addAttribute(
                attrName,
                attrType.id
            );

            await txRes.wait();

            const newType = await t.proofOfIdContract.getAttributeType(
                expectedId
            );

            expect(newType).to.equal(attrType.str);
        });

        it("Should emit an `AttributeAdded` event upon sucessfully adding an attribute", async function () {
            const t = await loadFixture(setup);

            const msg = "AttributeAdded";

            await expect(
                t.proofOfIdContract.addAttribute(attrName, attrType.id)
            )
                .to.emit(t.proofOfIdContract, msg)
                .withArgs(expectedId, attrName);
        });

        it("Should not allow adding an attribute with an unsupported type", async function () {
            const t = await loadFixture(setup);

            await expect(t.proofOfIdContract.addAttribute(attrName, 50)).to.be
                .reverted;
        });

        it("Should only allow and account with the role: OPERATOR_ROLE to add an attribute", async function () {
            const t = await loadFixture(setup);
            const c = t.proofOfIdContract.connect(t.accounts[0]);

            const err = accessControlErr("MISSING_ROLE");

            await expect(
                c.addAttribute(attrName, attrType.id)
            ).to.be.revertedWith(err);

            await t.issueIdentity(args);

            await expect(
                t.proofOfIdContract.addAttribute(attrName, attrType.id)
            ).to.not.be.reverted;
        });
    });

    /* Setting and Getting Attribute
    ======================================== */
    describe("Setting and Getting Attributes", function () {
        const a = generateDummyAddress("9182");
        const args = randIdArgs(a);
        const exp = BigInt(addTime(Date.now(), 5, "years", "sec"));

        // -- attribute counts -- //
        it("Should correctly set the attribute count", async function () {
            const t = await loadFixture(setup);

            let txRes = await t.proofOfIdContract.setAttributeCount(10n);
            await txRes.wait();

            let count = await t.proofOfIdContract.attributeCount();
            expect(count).to.equal(10n);

            txRes = await t.proofOfIdContract.setAttributeCount(1n);
            await txRes.wait();

            count = await t.proofOfIdContract.attributeCount();
            expect(count).to.equal(1n);
        });

        it("Should only allow an account with the role: OPERATOR_ROLE to set the attribute count", async function () {
            const t = await loadFixture(setup);
            const c = t.proofOfIdContract.connect(t.accounts[0]);

            const err = accessControlErr("MISSING_ROLE");

            await expect(c.setAttributeCount(5n)).to.be.revertedWith(err);

            await t.issueIdentity(args);

            await expect(t.proofOfIdContract.setAttributeCount(5n)).to.not.be
                .reverted;
        });

        it("Should correctly increment the attribute count", async function () {
            const t = await loadFixture(setup);

            let count = await t.proofOfIdContract.attributeCount();
            expect(count).to.equal(5n);

            let txRes = await t.proofOfIdContract.incrementAttributeCount();
            await txRes.wait();

            count = await t.proofOfIdContract.attributeCount();
            expect(count).to.equal(6n);

            txRes = await t.proofOfIdContract.incrementAttributeCount();
            await txRes.wait();

            count = await t.proofOfIdContract.attributeCount();
            expect(count).to.equal(7n);
        });

        it("Should only allow an account with the role: OPERATOR_ROLE to increment the attribute count", async function () {
            const t = await loadFixture(setup);
            const c = t.proofOfIdContract.connect(t.accounts[0]);

            const err = accessControlErr("MISSING_ROLE");

            await expect(c.incrementAttributeCount()).to.be.revertedWith(err);

            await t.issueIdentity(args);

            await expect(t.proofOfIdContract.incrementAttributeCount()).to.not
                .be.reverted;
        });

        // -- attribute types -- //
        it("Should correctly set and get an attribute's type", async function () {
            // Attribute types are NOT set in the contract's init function,
            // however the deploy script in
            // `utils/deploy/proof-of-identity/deployProofOfIdentity.ts`
            // does set the first attributes.
            const t = await loadFixture(setup);

            let ccTypeStr = await t.proofOfIdContract.getAttributeType(
                PROOF_OF_ID_ATTRIBUTES.COUNTRY_CODE.id
            );

            expect(ccTypeStr).to.equal(
                PROOF_OF_ID_ATTRIBUTES.COUNTRY_CODE.attrType.str
            );

            const proofOfLivelinessTypeStr =
                await t.proofOfIdContract.getAttributeType(
                    PROOF_OF_ID_ATTRIBUTES.PROOF_OF_LIVELINESS.id
                );

            expect(proofOfLivelinessTypeStr).to.equal(
                PROOF_OF_ID_ATTRIBUTES.PROOF_OF_LIVELINESS.attrType.str
            );

            // change country code type from string to u256
            let txRes = await t.proofOfIdContract.setAttributeType(
                PROOF_OF_ID_ATTRIBUTES.COUNTRY_CODE.id,
                SUPPORTED_ID_ATTRIBUTE_TYPES.U256.id
            );
            await txRes.wait();

            ccTypeStr = await t.proofOfIdContract.getAttributeType(
                PROOF_OF_ID_ATTRIBUTES.COUNTRY_CODE.id
            );

            expect(ccTypeStr).to.equal(SUPPORTED_ID_ATTRIBUTE_TYPES.U256.str);

            const bytesAttrName = "idDocumentHash";
            const bytesAttrType = SUPPORTED_ID_ATTRIBUTE_TYPES.BYTES;
            const expectedBytesId = await t.proofOfIdContract.attributeCount();

            // add the new bytes attr in
            txRes = await t.proofOfIdContract.addAttribute(
                bytesAttrName,
                bytesAttrType.id
            );
            await txRes.wait();

            const idDocHash = await t.proofOfIdContract.getAttributeType(
                expectedBytesId
            );
            expect(idDocHash).to.equal(SUPPORTED_ID_ATTRIBUTE_TYPES.BYTES.str);
        });

        it("Should revert when getting the attribute type for an out of range attribute", async function () {
            const t = await loadFixture(setup);
            const err = idErr("INVALID_ATTRIBUTE");
            const invalidId = 888;
            await expect(t.proofOfIdContract.getAttributeType(invalidId))
                .to.be.revertedWithCustomError(t.proofOfIdContract, err)
                .withArgs(invalidId);
        });

        it("Should only allow an account with the role: OPERATOR_ROLE to set an attribute's type", async function () {
            const t = await loadFixture(setup);
            const c = t.proofOfIdContract.connect(t.accounts[0]);

            const err = accessControlErr("MISSING_ROLE");

            await expect(
                c.setAttributeType(
                    PROOF_OF_ID_ATTRIBUTES.COUNTRY_CODE.id,
                    SUPPORTED_ID_ATTRIBUTE_TYPES.U256.id
                )
            ).to.be.revertedWith(err);

            await expect(
                t.proofOfIdContract.setAttributeType(
                    PROOF_OF_ID_ATTRIBUTES.COUNTRY_CODE.id,
                    SUPPORTED_ID_ATTRIBUTE_TYPES.U256.id
                )
            ).to.not.be.reverted;
        });

        // -- string attribute -- //
        it("Should correctly set a string attribute", async function () {
            const t = await loadFixture(setup);

            const cc = "sg";
            let attr = await t.proofOfIdContract.getCountryCode(a);
            expect(attr).to.deep.equal(["", 0n, 0n]);

            await t.issueIdentity(args);

            const txRes = await t.proofOfIdContract.setStringAttribute(
                a,
                PROOF_OF_ID_ATTRIBUTES.COUNTRY_CODE.id,
                exp,
                cc
            );
            const txRec = await txRes.wait();
            const ts = BigInt(await tsFromTxRec(txRec));

            attr = await t.proofOfIdContract.getCountryCode(a);
            expect(attr).to.deep.equal([cc, exp, ts]);
        });

        it("Should revert when setting a string attribute for an out of range attribute ID", async function () {
            const t = await loadFixture(setup);

            await t.issueIdentity(args);
            const attrCount = await t.proofOfIdContract.attributeCount();
            const err = idErr("INVALID_ATTRIBUTE");

            await expect(
                t.proofOfIdContract.setStringAttribute(a, attrCount, exp, "sg")
            ).to.be.revertedWithCustomError(t.proofOfIdContract, err);
        });

        it("Should revert when trying to set an attribute to a string that is not of type string", async function () {
            const t = await loadFixture(setup);

            await t.issueIdentity(args);
            const err = idErr("INVALID_ATTRIBUTE");

            // proof of liveliness expects type bool. here we are trying to set
            // to to a type of string. should revert.
            await expect(
                t.proofOfIdContract.setStringAttribute(
                    a,
                    PROOF_OF_ID_ATTRIBUTES.PROOF_OF_LIVELINESS.id,
                    exp,
                    "sg"
                )
            ).to.be.revertedWithCustomError(t.proofOfIdContract, err);
        });

        it("Should revert when setting a string attribute for an invalid expiry", async function () {
            const t = await loadFixture(setup);

            await t.issueIdentity(args);

            const err = idErr("INVALID_EXPIRY");

            // time in the past
            const past = (await time.latest()) - 100;

            await expect(
                t.proofOfIdContract.setStringAttribute(
                    a,
                    PROOF_OF_ID_ATTRIBUTES.COUNTRY_CODE.id,
                    past,
                    "sg"
                )
            ).to.be.revertedWithCustomError(t.proofOfIdContract, err);
        });

        it("Should revert when setting a string attribute for an account that does not have an ID NFT", async function () {
            const t = await loadFixture(setup);

            const err = idErr("NOT_VERIFIED");

            await expect(
                t.proofOfIdContract.setStringAttribute(
                    a,
                    PROOF_OF_ID_ATTRIBUTES.COUNTRY_CODE.id,
                    exp,
                    "sg"
                )
            ).to.be.revertedWithCustomError(t.proofOfIdContract, err);
        });

        it("Should only allow an account with the role: OPERATOR_ROLE to set a string attribute", async function () {
            const t = await loadFixture(setup);
            const c = t.proofOfIdContract.connect(t.accounts[0]);

            const err = accessControlErr("MISSING_ROLE");

            const cc = "sg";

            await expect(
                c.setStringAttribute(
                    a,
                    PROOF_OF_ID_ATTRIBUTES.COUNTRY_CODE.id,
                    exp,
                    cc
                )
            ).to.be.revertedWith(err);

            await t.issueIdentity(args);

            await expect(
                t.proofOfIdContract.setStringAttribute(
                    a,
                    PROOF_OF_ID_ATTRIBUTES.COUNTRY_CODE.id,
                    exp,
                    cc
                )
            ).to.not.be.reverted;
        });

        it("Should correctly get a string attribute", async function () {
            const t = await loadFixture(setup);

            const id = PROOF_OF_ID_ATTRIBUTES.COUNTRY_CODE.id;

            // case where the attribute hasn't been set - should return default
            // ("", 0, 0)
            const zeroRes = await t.proofOfIdContract.getStringAttribute(id, a);
            expect(zeroRes).to.deep.equal(["", 0n, 0n]);

            // issue id
            const txRec = await t.issueIdentity(args);
            const ts = await tsFromTxRec(txRec);

            // case where the attribute has been set
            const res = await t.proofOfIdContract.getStringAttribute(id, a);
            expect(res).to.deep.equal([
                args.countryCode,
                args.expiries[id],
                ts,
            ]);

            // case where getStringAttribute is used to retrieve an attribute
            // this is not a string. should revert
            await expect(
                t.proofOfIdContract.getStringAttribute(
                    PROOF_OF_ID_ATTRIBUTES.PROOF_OF_LIVELINESS.id,
                    a
                )
            ).to.be.revertedWithCustomError(
                t.proofOfIdContract,
                idErr("INVALID_ATTRIBUTE")
            );
        });

        // -- uint256 attribute -- //
        it("Should correctly set a uint256 attribute", async function () {
            const t = await loadFixture(setup);

            const userType = 1n;
            let attr = await t.proofOfIdContract.getUserType(a);
            expect(attr).to.deep.equal([0n, 0n, 0n]);

            await t.issueIdentity(args);

            const txRes = await t.proofOfIdContract.setU256Attribute(
                a,
                PROOF_OF_ID_ATTRIBUTES.USER_TYPE.id,
                exp,
                userType
            );
            const txRec = await txRes.wait();
            const ts = BigInt(await tsFromTxRec(txRec));

            attr = await t.proofOfIdContract.getUserType(a);
            expect(attr).to.deep.equal([userType, exp, ts]);
        });

        it("Should revert when setting a uint256 attribute for an out of range attribute ID", async function () {
            const t = await loadFixture(setup);

            const attrCount = await t.proofOfIdContract.attributeCount();
            const err = idErr("INVALID_ATTRIBUTE");

            await t.issueIdentity(args);

            await expect(
                t.proofOfIdContract.setU256Attribute(a, attrCount, exp, 1n)
            ).to.be.revertedWithCustomError(t.proofOfIdContract, err);
        });

        it("Should revert when trying to set an attribute to a uint256 that is not of type uint256", async function () {
            const t = await loadFixture(setup);

            await t.issueIdentity(args);
            const err = idErr("INVALID_ATTRIBUTE");

            // proof of liveliness expects type bool. here we are trying to set
            // to to a type of u256. should revert.
            await expect(
                t.proofOfIdContract.setU256Attribute(
                    a,
                    PROOF_OF_ID_ATTRIBUTES.PROOF_OF_LIVELINESS.id,
                    exp,
                    12n
                )
            ).to.be.revertedWithCustomError(t.proofOfIdContract, err);
        });

        it("Should revert when setting a uint256 attribute for an invalid expiry", async function () {
            const t = await loadFixture(setup);

            const err = idErr("INVALID_EXPIRY");

            await t.issueIdentity(args);

            // time in the past
            const past = (await time.latest()) - 100;

            await expect(
                t.proofOfIdContract.setU256Attribute(
                    a,
                    PROOF_OF_ID_ATTRIBUTES.COMPETENCY_RATING.id,
                    past,
                    1n
                )
            ).to.be.revertedWithCustomError(t.proofOfIdContract, err);
        });

        it("Should revert when setting a u256 attribute for an account that does not have an ID NFT", async function () {
            const t = await loadFixture(setup);

            const err = idErr("NOT_VERIFIED");

            await expect(
                t.proofOfIdContract.setU256Attribute(
                    a,
                    PROOF_OF_ID_ATTRIBUTES.COMPETENCY_RATING.id,
                    exp,
                    5n
                )
            ).to.be.revertedWithCustomError(t.proofOfIdContract, err);
        });

        it("Should only allow an account with the role: OPERATOR_ROLE to set a uint256 attribute", async function () {
            const t = await loadFixture(setup);
            const c = t.proofOfIdContract.connect(t.accounts[0]);

            const err = accessControlErr("MISSING_ROLE");

            const userType = 1n;
            await expect(
                c.setU256Attribute(
                    a,
                    PROOF_OF_ID_ATTRIBUTES.USER_TYPE.id,
                    exp,
                    userType
                )
            ).to.be.revertedWith(err);

            await t.issueIdentity(args);

            await expect(
                t.proofOfIdContract.setU256Attribute(
                    a,
                    PROOF_OF_ID_ATTRIBUTES.USER_TYPE.id,
                    exp,
                    userType
                )
            ).to.not.be.reverted;
        });

        it("Should correctly get a uint256  attribute", async function () {
            const t = await loadFixture(setup);

            const id = PROOF_OF_ID_ATTRIBUTES.USER_TYPE.id;

            // case where the attribute hasn't been set - should return default
            // (0, 0, 0)
            const zeroRes = await t.proofOfIdContract.getU256Attribute(id, a);
            expect(zeroRes).to.deep.equal([0n, 0n, 0n]);

            // issue id
            const txRec = await t.issueIdentity(args);
            const ts = await tsFromTxRec(txRec);

            // case where the attribute has been set
            const res = await t.proofOfIdContract.getU256Attribute(id, a);
            expect(res).to.deep.equal([args.userType, args.expiries[id], ts]);

            // case where getU256Attribute is used to retrieve an attribute
            // this is not a uint256. should revert
            await expect(
                t.proofOfIdContract.getU256Attribute(
                    PROOF_OF_ID_ATTRIBUTES.PROOF_OF_LIVELINESS.id,
                    a
                )
            ).to.be.revertedWithCustomError(
                t.proofOfIdContract,
                idErr("INVALID_ATTRIBUTE")
            );
        });

        // -- bool attribute -- //
        it("Should correctly set a bool attribute", async function () {
            const t = await loadFixture(setup);

            const isAlive = true;

            let attr = await t.proofOfIdContract.getProofOfLiveliness(a);
            expect(attr).to.deep.equal([false, 0n, 0n]);

            await t.issueIdentity(args);

            const txRes = await t.proofOfIdContract.setBoolAttribute(
                a,
                PROOF_OF_ID_ATTRIBUTES.PROOF_OF_LIVELINESS.id,
                exp,
                isAlive
            );
            const txRec = await txRes.wait();
            const ts = BigInt(await tsFromTxRec(txRec));

            attr = await t.proofOfIdContract.getProofOfLiveliness(a);
            expect(attr).to.deep.equal([isAlive, exp, ts]);
        });

        it("Should revert when setting a bool attribute for an out of range attribute ID", async function () {
            const t = await loadFixture(setup);

            await t.issueIdentity(args);

            const attrCount = await t.proofOfIdContract.attributeCount();
            const err = idErr("INVALID_ATTRIBUTE");

            await expect(
                t.proofOfIdContract.setBoolAttribute(a, attrCount, exp, true)
            ).to.be.revertedWithCustomError(t.proofOfIdContract, err);
        });

        it("Should revert when trying to set an attribute to a bool that is not of type bool", async function () {
            const t = await loadFixture(setup);

            await t.issueIdentity(args);
            const err = idErr("INVALID_ATTRIBUTE");

            // country code expects type string. here we are trying to set
            // to to a type of bool. should revert.
            await expect(
                t.proofOfIdContract.setBoolAttribute(
                    a,
                    PROOF_OF_ID_ATTRIBUTES.COUNTRY_CODE.id,
                    exp,
                    true
                )
            ).to.be.revertedWithCustomError(t.proofOfIdContract, err);
        });

        it("Should revert when setting a bool attribute for an invalid expiry", async function () {
            const t = await loadFixture(setup);

            await t.issueIdentity(args);

            const err = idErr("INVALID_EXPIRY");

            // time in the past
            const past = (await time.latest()) - 100;

            await expect(
                t.proofOfIdContract.setBoolAttribute(
                    a,
                    PROOF_OF_ID_ATTRIBUTES.PRIMARY_ID.id,
                    past,
                    true
                )
            ).to.be.revertedWithCustomError(t.proofOfIdContract, err);
        });

        it("Should revert when setting a bool attribute for an account that does not have an ID NFT", async function () {
            const t = await loadFixture(setup);

            const err = idErr("NOT_VERIFIED");

            await expect(
                t.proofOfIdContract.setBoolAttribute(
                    a,
                    PROOF_OF_ID_ATTRIBUTES.PRIMARY_ID.id,
                    exp,
                    true
                )
            ).to.be.revertedWithCustomError(t.proofOfIdContract, err);
        });

        it("Should only allow an account with the role: OPERATOR_ROLE to set a bool attribute", async function () {
            const t = await loadFixture(setup);
            const c = t.proofOfIdContract.connect(t.accounts[0]);

            const err = accessControlErr("MISSING_ROLE");

            const isAlive = true;
            await expect(
                c.setBoolAttribute(
                    a,
                    PROOF_OF_ID_ATTRIBUTES.PRIMARY_ID.id,
                    exp,
                    isAlive
                )
            ).to.be.revertedWith(err);

            await t.issueIdentity(args);

            await expect(
                t.proofOfIdContract.setBoolAttribute(
                    a,
                    PROOF_OF_ID_ATTRIBUTES.PRIMARY_ID.id,
                    exp,
                    isAlive
                )
            ).to.not.be.reverted;
        });

        it("Should correctly get a bool attribute", async function () {
            const t = await loadFixture(setup);

            const id = PROOF_OF_ID_ATTRIBUTES.PRIMARY_ID.id;

            // case where the attribute hasn't been set - should return default
            // (false, 0, 0)
            const zeroRes = await t.proofOfIdContract.getBoolAttribute(id, a);
            expect(zeroRes).to.deep.equal([false, 0n, 0n]);

            // issue id
            const txRec = await t.issueIdentity(args);
            const ts = await tsFromTxRec(txRec);

            // case where the attribute has been set
            const res = await t.proofOfIdContract.getBoolAttribute(id, a);
            expect(res).to.deep.equal([args.primaryID, args.expiries[id], ts]);

            // case where getBoolAttribute is used to retrieve an attribute
            // this is not a bool. should revert
            await expect(
                t.proofOfIdContract.getBoolAttribute(
                    PROOF_OF_ID_ATTRIBUTES.COUNTRY_CODE.id,
                    a
                )
            ).to.be.revertedWithCustomError(
                t.proofOfIdContract,
                idErr("INVALID_ATTRIBUTE")
            );
        });

        // -- bytes attribute --
        it("Should correctly set a bytes attribute", async function () {
            const t = await loadFixture(setup);

            const attrName = "idDocumentHash";
            const attrType = SUPPORTED_ID_ATTRIBUTE_TYPES.BYTES;
            const expectedId = await t.proofOfIdContract.attributeCount();
            const data = ethers.hashMessage("super secret id");

            // add the new bytes attr in
            let txRes = await t.proofOfIdContract.addAttribute(
                attrName,
                attrType.id
            );
            await txRes.wait();

            // case for when a query is made to an account that has not had the
            // attribute set.
            let attr = await t.proofOfIdContract.getBytesAttribute(
                expectedId,
                a
            );
            expect(attr).to.deep.equal(["0x", 0n, 0n]);

            // case for when a query is made to an account that has had the
            // attribute set
            await t.issueIdentity(args);

            txRes = await t.proofOfIdContract.setBytesAttribute(
                a,
                expectedId,
                exp,
                data
            );
            const txRec = await txRes.wait();
            const ts = BigInt(await tsFromTxRec(txRec));

            attr = await t.proofOfIdContract.getBytesAttribute(expectedId, a);
            expect(attr).to.deep.equal([data, exp, ts]);
        });

        it("Should revert when setting a bytes attribute for an out of range attribute ID", async function () {
            const t = await loadFixture(setup);

            const attrName = "idDocumentHash";
            const attrType = SUPPORTED_ID_ATTRIBUTE_TYPES.BYTES;
            const data = ethers.hashMessage("data");

            await t.issueIdentity(args);

            // add the new bytes attr in
            const txRes = await t.proofOfIdContract.addAttribute(
                attrName,
                attrType.id
            );
            await txRes.wait();

            // use attr count to represent out of range id
            const attrCount = await t.proofOfIdContract.attributeCount();
            const err = idErr("INVALID_ATTRIBUTE");

            await expect(
                t.proofOfIdContract.setBytesAttribute(a, attrCount, exp, data)
            ).to.be.revertedWithCustomError(t.proofOfIdContract, err);
        });

        it("Should revert when trying to set an attribute to a bytes that is not of type bytes", async function () {
            const t = await loadFixture(setup);

            const attrName = "idDocumentHash";
            const attrType = SUPPORTED_ID_ATTRIBUTE_TYPES.BYTES;
            const data = ethers.hashMessage("data");

            // add the new bytes attr in
            const txRes = await t.proofOfIdContract.addAttribute(
                attrName,
                attrType.id
            );
            await txRes.wait();

            await t.issueIdentity(args);
            const err = idErr("INVALID_ATTRIBUTE");

            // country code expects type string. here we are trying to set
            // to to a type of bytes. should revert.
            await expect(
                t.proofOfIdContract.setBytesAttribute(
                    a,
                    PROOF_OF_ID_ATTRIBUTES.COUNTRY_CODE.id,
                    exp,
                    data
                )
            ).to.be.revertedWithCustomError(t.proofOfIdContract, err);
        });

        it("Should revert when setting a bytes attribute for an invalid expiry", async function () {
            const t = await loadFixture(setup);

            const attrName = "idDocumentHash";
            const attrType = SUPPORTED_ID_ATTRIBUTE_TYPES.BYTES;
            const expectedId = await t.proofOfIdContract.attributeCount();
            const data = ethers.hashMessage("data");

            // add the new bytes attr in
            const txRes = await t.proofOfIdContract.addAttribute(
                attrName,
                attrType.id
            );
            await txRes.wait();

            await t.issueIdentity(args);

            const err = idErr("INVALID_EXPIRY");

            // time in the past
            const past = (await time.latest()) - 100;

            await expect(
                t.proofOfIdContract.setBytesAttribute(a, expectedId, past, data)
            ).to.be.revertedWithCustomError(t.proofOfIdContract, err);
        });

        it("Should revert when setting a bytes attribute for an account that does not have an ID NFT", async function () {
            const t = await loadFixture(setup);

            const attrName = "idDocumentHash";
            const attrType = SUPPORTED_ID_ATTRIBUTE_TYPES.BYTES;
            const expectedId = await t.proofOfIdContract.attributeCount();
            const data = ethers.hashMessage("data");

            // add the new bytes attr in
            const txRes = await t.proofOfIdContract.addAttribute(
                attrName,
                attrType.id
            );
            await txRes.wait();

            const err = idErr("NOT_VERIFIED");

            await expect(
                t.proofOfIdContract.setBytesAttribute(a, expectedId, exp, data)
            ).to.be.revertedWithCustomError(t.proofOfIdContract, err);
        });

        it("Should only allow an account with the role: OPERATOR_ROLE to set a bytes attribute", async function () {
            const t = await loadFixture(setup);
            const c = t.proofOfIdContract.connect(t.accounts[0]);

            const attrName = "idDocumentHash";
            const attrType = SUPPORTED_ID_ATTRIBUTE_TYPES.BYTES;
            const expectedId = await t.proofOfIdContract.attributeCount();

            // add the new bytes attr in
            const txRes = await t.proofOfIdContract.addAttribute(
                attrName,
                attrType.id
            );
            await txRes.wait();

            const err = accessControlErr("MISSING_ROLE");

            const data = "0x74";
            await expect(
                c.setBytesAttribute(a, expectedId, exp, data)
            ).to.be.revertedWith(err);

            await t.issueIdentity(args);

            await expect(
                t.proofOfIdContract.setBytesAttribute(a, expectedId, exp, data)
            ).to.not.be.reverted;
        });

        it("Should correctly get a bytes attribute", async function () {
            const t = await loadFixture(setup);

            const attrName = "idDocumentHash";
            const attrType = SUPPORTED_ID_ATTRIBUTE_TYPES.BYTES;
            const id = await t.proofOfIdContract.attributeCount();
            const data = ethers.hashMessage("super secret id");

            // add the new bytes attr in
            let txRes = await t.proofOfIdContract.addAttribute(
                attrName,
                attrType.id
            );
            await txRes.wait();

            // case where the attribute hasn't been set - should return default
            // ("0x", 0, 0)
            const zeroRes = await t.proofOfIdContract.getBytesAttribute(id, a);
            expect(zeroRes).to.deep.equal(["0x", 0n, 0n]);

            // issue id
            await t.issueIdentity(args);

            // case where the attribute has been set
            txRes = await t.proofOfIdContract.setBytesAttribute(
                a,
                id,
                exp,
                data
            );
            const txRec = await txRes.wait();
            const ts = await tsFromTxRec(txRec);

            const res = await t.proofOfIdContract.getBytesAttribute(id, a);
            expect(res).to.deep.equal([data, exp, ts]);

            // case where getBytesAttribute is used to retrieve an attribute
            // this is not bytes. should revert
            await expect(
                t.proofOfIdContract.getBytesAttribute(
                    PROOF_OF_ID_ATTRIBUTES.COUNTRY_CODE.id,
                    a
                )
            ).to.be.revertedWithCustomError(
                t.proofOfIdContract,
                idErr("INVALID_ATTRIBUTE")
            );
        });

        // -- specific getters -- //
        it("Should correctly get an account's `primaryID` attribute", async function () {
            const t = await loadFixture(setup);

            let attr = await t.proofOfIdContract.getPrimaryID(a);
            expect(attr).to.deep.equal([false, 0n, 0n]);

            const txRec = await t.issueIdentity(args);
            const ts = BigInt(await tsFromTxRec(txRec));

            attr = await t.proofOfIdContract.getPrimaryID(a);
            expect(attr).to.deep.equal([
                args.primaryID,
                args.expiries[PROOF_OF_ID_ATTRIBUTES.PRIMARY_ID.id],
                ts,
            ]);
        });

        it("Should correctly get an account's `countryCode` attribute", async function () {
            const t = await loadFixture(setup);

            let attr = await t.proofOfIdContract.getCountryCode(a);
            expect(attr).to.deep.equal(["", 0n, 0n]);

            const txRec = await t.issueIdentity(args);
            const ts = BigInt(await tsFromTxRec(txRec));

            attr = await t.proofOfIdContract.getCountryCode(a);

            expect(attr).to.deep.equal([
                args.countryCode,
                args.expiries[PROOF_OF_ID_ATTRIBUTES.COUNTRY_CODE.id],
                ts,
            ]);
        });

        it("Should correctly get an account's `proofOfLiveliness` attribute", async function () {
            const t = await loadFixture(setup);

            let attr = await t.proofOfIdContract.getProofOfLiveliness(a);
            expect(attr).to.deep.equal([false, 0n, 0n]);

            const txRec = await t.issueIdentity(args);
            const ts = BigInt(await tsFromTxRec(txRec));

            attr = await t.proofOfIdContract.getProofOfLiveliness(a);

            expect(attr).to.deep.equal([
                args.proofOfLiveliness,
                args.expiries[PROOF_OF_ID_ATTRIBUTES.PROOF_OF_LIVELINESS.id],
                ts,
            ]);
        });

        it("Should correctly get an account's `userType` attribute", async function () {
            const t = await loadFixture(setup);

            let attr = await t.proofOfIdContract.getUserType(a);
            expect(attr).to.deep.equal([0n, 0n, 0n]);

            const txRec = await t.issueIdentity(args);
            const ts = BigInt(await tsFromTxRec(txRec));

            attr = await t.proofOfIdContract.getUserType(a);
            expect(attr).to.deep.equal([
                args.userType,
                args.expiries[PROOF_OF_ID_ATTRIBUTES.USER_TYPE.id],
                ts,
            ]);
        });

        it("Should correctly get an account's `competencyRating` attribute", async function () {
            const t = await loadFixture(setup);

            const rating = BigInt(randomNumber(1, 101));

            let attr = await t.proofOfIdContract.getCompetencyRating(a);
            expect(attr).to.deep.equal([0n, 0n, 0n]);

            await t.issueIdentity(args);

            const txRes = await t.proofOfIdContract.setU256Attribute(
                a,
                PROOF_OF_ID_ATTRIBUTES.COMPETENCY_RATING.id,
                exp,
                rating
            );
            const txRec = await txRes.wait();
            const ts = BigInt(await tsFromTxRec(txRec));

            attr = await t.proofOfIdContract.getCompetencyRating(a);
            expect(attr).to.deep.equal([rating, exp, ts]);
        });

        // -- setting and getting name -- //
        it("Should correctly set and get an attribute's name", async function () {
            const { proofOfIdContract: c } = await loadFixture(setup);

            const primaryID = await c.getAttributeName(
                PROOF_OF_ID_ATTRIBUTES.PRIMARY_ID.id
            );

            const countryCode = await c.getAttributeName(
                PROOF_OF_ID_ATTRIBUTES.COUNTRY_CODE.id
            );

            const proofOfLiveliness = await c.getAttributeName(
                PROOF_OF_ID_ATTRIBUTES.PROOF_OF_LIVELINESS.id
            );

            const userType = await c.getAttributeName(
                PROOF_OF_ID_ATTRIBUTES.USER_TYPE.id
            );

            const compRating = await c.getAttributeName(
                PROOF_OF_ID_ATTRIBUTES.COMPETENCY_RATING.id
            );

            expect(primaryID).to.equal(PROOF_OF_ID_ATTRIBUTES.PRIMARY_ID.name);
            expect(countryCode).to.equal(
                PROOF_OF_ID_ATTRIBUTES.COUNTRY_CODE.name
            );
            expect(proofOfLiveliness).to.equal(
                PROOF_OF_ID_ATTRIBUTES.PROOF_OF_LIVELINESS.name
            );
            expect(userType).to.equal(PROOF_OF_ID_ATTRIBUTES.USER_TYPE.name);
            expect(compRating).to.equal(
                PROOF_OF_ID_ATTRIBUTES.COMPETENCY_RATING.name
            );

            const newName = "testName";
            const txRes = await c.setAttributeName(
                PROOF_OF_ID_ATTRIBUTES.PRIMARY_ID.id,
                newName
            );
            await txRes.wait();

            const newPrimaryID = await c.getAttributeName(
                PROOF_OF_ID_ATTRIBUTES.PRIMARY_ID.id
            );

            expect(newPrimaryID).to.equal(newName);
        });

        it("Should return an empty string when geting the name of an attribute that does not exist", async function () {
            const { proofOfIdContract: c } = await loadFixture(setup);
            expect(await c.getAttributeName(1000)).to.equal("");
        });

        it("Should revert when setting a name for an out of range attribute ID", async function () {
            const { proofOfIdContract: c } = await loadFixture(setup);

            const attrCount = await c.attributeCount();
            const err = idErr("INVALID_ATTRIBUTE");

            await expect(
                c.setAttributeName(attrCount, "name")
            ).to.be.revertedWithCustomError(c, err);
        });

        it("Should only allow an account with the role: OPERATOR_ROLE to set an attribute name", async function () {
            const t = await loadFixture(setup);
            const c = t.proofOfIdContract.connect(t.accounts[0]);

            const id = PROOF_OF_ID_ATTRIBUTES.COUNTRY_CODE.id;
            const err = accessControlErr("MISSING_ROLE");
            const newName = "newName";

            await expect(c.setAttributeName(id, newName)).to.be.revertedWith(
                err
            );

            await expect(t.proofOfIdContract.setAttributeName(id, newName)).to
                .not.be.reverted;
        });

        it("Should emit an `AttributeSet` event upon successfully setting an attribute", async function () {
            const t = await loadFixture(setup);

            await t.issueIdentity(args);

            const r = BigInt(randomNumber(1, 101));
            const msg = "AttributeSet";
            const id = PROOF_OF_ID_ATTRIBUTES.COMPETENCY_RATING.id;

            await expect(t.proofOfIdContract.setU256Attribute(a, id, exp, r))
                .to.emit(t.proofOfIdContract, msg)
                .withArgs(a, id);
        });
    });

    /* Issue Identity
    ======================================== */
    describe("Issue Identity", function () {
        // construct id args
        const addr = generateDummyAddress("7898");
        const args = randIdArgs(addr);

        it("Should correctly issue an ID NFT", async function () {
            const t = await loadFixture(setup);

            let bal = await t.proofOfIdContract.balanceOf(addr);
            expect(bal).to.equal(0n);

            await t.issueIdentity(args);

            bal = await t.proofOfIdContract.balanceOf(addr);
            expect(bal).to.equal(1n);
        });

        it("Should correctly set the core attributes of an account when issuing an ID NFT", async function () {
            const t = await loadFixture(setup);

            // issue id
            const txRec = await t.issueIdentity(args);

            // get timestamp
            const ts = await tsFromTxRec(txRec);

            // test primary id
            const primaryId = await t.proofOfIdContract.getPrimaryID(addr);

            const expectedPrimaryId = [
                args.primaryID,
                args.expiries[PROOF_OF_ID_ATTRIBUTES.PRIMARY_ID.id],
                ts,
            ];

            expect(primaryId).to.deep.equal(expectedPrimaryId);

            // test country code
            const countryCode = await t.proofOfIdContract.getCountryCode(addr);

            const expectedCountryCode = [
                args.countryCode,
                args.expiries[PROOF_OF_ID_ATTRIBUTES.COUNTRY_CODE.id],
                ts,
            ];

            expect(countryCode).to.deep.equal(expectedCountryCode);

            // test proof of livelinesss
            const liveliness = await t.proofOfIdContract.getProofOfLiveliness(
                addr
            );

            const expectedLiveliness = [
                args.proofOfLiveliness,
                args.expiries[PROOF_OF_ID_ATTRIBUTES.PROOF_OF_LIVELINESS.id],
                ts,
            ];

            expect(liveliness).to.deep.equal(expectedLiveliness);

            // test user type
            const userType = await t.proofOfIdContract.getUserType(addr);

            const expectedUserType = [
                args.userType,
                args.expiries[PROOF_OF_ID_ATTRIBUTES.USER_TYPE.id],
                ts,
            ];

            expect(userType).to.deep.equal(expectedUserType);
        });

        it("Should correctly set the token URI when issuing an ID NFT", async function () {
            const t = await loadFixture(setup);

            await t.issueIdentity(args);

            const tokenId = await t.proofOfIdContract.tokenID(addr);
            const tokenUri = await t.proofOfIdContract.tokenURI(tokenId);

            expect(tokenUri).to.equal(args.tokenURI);
        });

        it("Should correctly update the token ID counter when issuing an ID NFT", async function () {
            const t = await loadFixture(setup);

            let count = await t.proofOfIdContract.tokenIDCounter();
            expect(count).to.equal(0n);

            await t.issueIdentity(args);

            count = await t.proofOfIdContract.tokenIDCounter();
            expect(count).to.equal(1n);
        });

        it("Should only allow an account with the role: OPERATOR_ROLE to issue an ID NFT", async function () {
            const t = await loadFixture(setup);

            const c = t.proofOfIdContract.connect(t.accounts[0]);
            const err = accessControlErr("MISSING_ROLE");

            await expect(
                c.issueIdentity(
                    args.account,
                    args.primaryID,
                    args.countryCode,
                    args.proofOfLiveliness,
                    args.userType,
                    args.expiries,
                    args.tokenURI
                )
            ).to.be.revertedWith(err);
            await expect(t.issueIdentity(args)).to.not.be.reverted;
        });

        it("Should not allow issuing an identity when any of the expiries are invalid", async function () {
            const t = await loadFixture(setup);

            const exp = addTime(Date.now(), 1, "months", "sec");
            const invalidArgs: IssueIdArgs = {
                ...args,
                expiries: [exp, 0n, exp, exp],
            };

            const err = idErr("INVALID_EXPIRY");

            await expect(
                t.issueIdentity(invalidArgs)
            ).to.be.revertedWithCustomError(t.proofOfIdContract, err);
        });

        it("Should not allow issuing an identity to an account that already holds an ID NFT", async function () {
            const t = await loadFixture(setup);

            await t.issueIdentity(args);

            const err = idErr("ALREADY_VERIFIED");

            await expect(t.issueIdentity(args)).to.be.revertedWithCustomError(
                t.proofOfIdContract,
                err
            );
        });

        it("Should emit an `IdentityIssued` event when successfully issuing an ID NFT", async function () {
            const t = await loadFixture(setup);

            const msg = "IdentityIssued";

            await expect(t.issueIdentity(args))
                .to.emit(t.proofOfIdContract, msg)
                .withArgs(args.account, 1n);
        });
    });

    /* Setting and Getting URI
    ======================================== */
    describe("Setting and Getting Token URI", function () {
        const a = generateDummyAddress("9182");
        const args = randIdArgs(a);
        const newURI = "new_token_uri";

        it("Should correctly get and set the token URI", async function () {
            const t = await loadFixture(setup);

            await t.issueIdentity(args);

            const id = await t.proofOfIdContract.tokenID(a);
            let uri = await t.proofOfIdContract.tokenURI(id);

            expect(uri).to.equal(args.tokenURI);

            const txRes = await t.proofOfIdContract.setTokenURI(a, id, newURI);
            await txRes.wait();

            uri = await t.proofOfIdContract.tokenURI(id);

            expect(uri).to.equal(newURI);
        });

        it("Should only allow an account with the role: OPERATOR_ROLE to set a token URI", async function () {
            const t = await loadFixture(setup);

            await t.issueIdentity(args);

            const c = t.proofOfIdContract.connect(t.accounts[0]);
            const err = accessControlErr("MISSING_ROLE");

            const id = await t.proofOfIdContract.tokenID(a);

            await expect(c.setTokenURI(a, id, newURI)).to.be.revertedWith(err);

            await expect(t.proofOfIdContract.setTokenURI(a, id, newURI)).to.not
                .be.reverted;
        });

        it("Should revert when setting a URI for an invalid token ID", async function () {
            const { proofOfIdContract: c } = await loadFixture(setup);

            const invalidToken = 8310n;
            const err = idErr("INVALID_TOKEN_ID");

            await expect(c.setTokenURI(a, invalidToken, newURI))
                .to.be.revertedWithCustomError(c, err)
                .withArgs(invalidToken);
        });

        it("Should revert when fetching a URI for an invalid token ID", async function () {
            const { proofOfIdContract: c } = await loadFixture(setup);

            const invalidToken = 8310n;
            const err = idErr("INVALID_TOKEN_ID");

            await expect(c.tokenURI(invalidToken))
                .to.be.revertedWithCustomError(c, err)
                .withArgs(invalidToken);
        });
    });

    /* Upgrading
    ======================================== */
    describe("Suspending and Unsuspending", function () {
        const a = generateDummyAddress("71245");
        const args = randIdArgs(a);
        const reason = "malicious behaviour";

        it("Should correctly suspend an account", async function () {
            const t = await loadFixture(setup);

            await t.issueIdentity(args);
            let isSuspended = await t.proofOfIdContract.isSuspended(a);

            expect(isSuspended).to.be.false;

            const txRes = await t.proofOfIdContract.suspendAccount(a, reason);
            await txRes.wait();

            isSuspended = await t.proofOfIdContract.isSuspended(a);
            expect(isSuspended).to.be.true;
        });

        it("Should only allow an account with the role: OPERATOR_ROLE to suspend an account", async function () {
            const t = await loadFixture(setup);
            const c = t.proofOfIdContract.connect(t.accounts[0]);

            await t.issueIdentity(args);

            const err = accessControlErr("MISSING_ROLE");

            await expect(c.suspendAccount(a, reason)).to.be.revertedWith(err);
            await expect(t.proofOfIdContract.suspendAccount(a, reason)).to.not
                .be.reverted;
        });

        it("Should emit an `AccountSuspended` event upon the successful suspension of an account", async function () {
            const t = await loadFixture(setup);

            await t.issueIdentity(args);

            const msg = "AccountSuspended";

            await expect(t.proofOfIdContract.suspendAccount(a, reason))
                .to.emit(t.proofOfIdContract, msg)
                .withArgs(a, reason);
        });

        it("Should correctly unsuspend an account", async function () {
            const t = await loadFixture(setup);

            await t.issueIdentity(args);
            let isSuspended = await t.proofOfIdContract.isSuspended(a);

            expect(isSuspended).to.be.false;

            let txRes = await t.proofOfIdContract.suspendAccount(a, reason);
            await txRes.wait();

            isSuspended = await t.proofOfIdContract.isSuspended(a);
            expect(isSuspended).to.be.true;

            txRes = await t.proofOfIdContract.unsuspendAccount(a);
            await txRes.wait();

            isSuspended = await t.proofOfIdContract.isSuspended(a);
            expect(isSuspended).to.be.false;
        });

        it("Should only allow an account with the role: OPERATOR_ROLE to unsuspend an account", async function () {
            const t = await loadFixture(setup);
            const c = t.proofOfIdContract.connect(t.accounts[0]);

            await t.issueIdentity(args);

            const err = accessControlErr("MISSING_ROLE");

            const txRes = await t.proofOfIdContract.suspendAccount(a, reason);
            await txRes.wait();

            await expect(c.unsuspendAccount(a)).to.be.revertedWith(err);
            await expect(t.proofOfIdContract.unsuspendAccount(a)).to.not.be
                .reverted;
        });

        it("Should emit an `AccountUnsuspended` event upon the successful unsuspension of an account", async function () {
            const t = await loadFixture(setup);

            await t.issueIdentity(args);

            const txRes = await t.proofOfIdContract.suspendAccount(a, reason);
            await txRes.wait();

            const msg = "AccountUnsuspended";

            await expect(t.proofOfIdContract.unsuspendAccount(a))
                .to.emit(t.proofOfIdContract, msg)
                .withArgs(a);
        });
    });

    /* Transferring
    ======================================== */
    describe("ID NFT Transfer", function () {
        it("Should not allow an ID NFT to be transferred", async function () {
            const t = await loadFixture(setup);

            const err = idErr("NOT_TRANSFERABLE");

            const a = t.accountAddresses[0];
            const c = t.proofOfIdContract.connect(t.accounts[0]);
            const to = generateDummyAddress("12234");

            const args = randIdArgs(a);

            await t.issueIdentity(args);

            const tokenId = await t.proofOfIdContract.tokenID(a);

            await expect(
                c.transferFrom(a, to, tokenId)
            ).to.be.revertedWithCustomError(c, err);
        });
    });

    /* Upgrading
    ======================================== */
    describe("Upgrading", function () {
        it("Should correctly upgrade", async function () {
            const t = await loadFixture(setup);

            // --- Desc of Test: ---
            // inside contracts/proof-of-identity/test/UpgradedPOI.sol
            // there is a minimally upgraded version of the Proof of Identity
            // contract.
            // It adds one extra attribure (a sixth) - "accredited".
            // It adds a getter for this attribute too.

            const a = generateDummyAddress("19287");
            const exp = BigInt(addTime(Date.now(), 1, "years", "sec"));
            const args = randIdArgs(a);

            // issue an id and check balance before upgrade
            await t.issueIdentity(args);
            let bal = await t.proofOfIdContract.balanceOf(a);
            expect(bal).to.equal(1n);

            // check old attribute count - should be five (5)
            const oldAttrCount = await t.proofOfIdContract.attributeCount();
            expect(oldAttrCount).to.equal(5n);

            // upgrade
            const newImpl = await ethers.getContractFactory("UpgradedPOI");

            const c = await upgradeProofOfIdentity<UpgradedPOI>(
                t.proofOfIdContractAddress,
                newImpl,
                t.foundation
            );

            // check the balance after the upgrade - should still be one (1)
            bal = await c.balanceOf(a);
            expect(bal).to.equal(1n);

            // add in the info for the new attribute
            let txRes = await t.proofOfIdContract.addAttribute(
                "accredited",
                SUPPORTED_ID_ATTRIBUTE_TYPES.BOOL.id
            );
            await txRes.wait();

            let isAccredited = await c.getIsAccredited(a);
            expect(isAccredited).to.deep.equal([false, 0n, 0n]);

            // set the new "accredited" attribute for an address and ensure it
            // matches
            txRes = await c.setBoolAttribute(a, 5, exp, true);
            const txRec = await txRes.wait();

            const ts = await tsFromTxRec(txRec);

            isAccredited = await c.getIsAccredited(a);
            expect(isAccredited).to.deep.equal([true, exp, ts]);
        });

        it("Should only allow an account with the DEFAULT_ADMIN_ROLE to call _authorizeUpgrade", async function () {
            const t = await loadFixture(setup);

            const c = t.proofOfIdContract.connect(t.accounts[0]);

            const err = accessControlErr("MISSING_ROLE");
            const a = generateDummyAddress("888");

            await expect(c.upgradeTo(a)).to.be.revertedWith(err);
        });
    });

    /* Interface
    ======================================== */
    describe("Supports Interface", function () {
        it("Should correctly run supportsInterface ", async function () {
            const t = await loadFixture(setup);

            expect(
                await t.proofOfIdContract.supportsInterface(
                    ERC_721_INTERFACE_ID
                )
            ).to.be.true;

            expect(await t.proofOfIdContract.supportsInterface("0x00000000")).to
                .be.false;
        });
    });
});
