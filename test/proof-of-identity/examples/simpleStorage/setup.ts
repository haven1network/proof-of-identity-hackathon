/* IMPORT NODE MODULES
================================================== */
import { ethers } from "hardhat";

/* IMPORT TYPES
================================================== */
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import type { AddressLike, BigNumberish } from "ethers";
import type { SimpleStoragePOI } from "@typechain/index";

/* CONSTANTS, TYPES AND UTILS
================================================== */
export type SimpleStorageArgs = {
    adminAddress: AddressLike;
    proofOfIdentityAddress: AddressLike;
    competencyRatingThreshold: BigNumberish;
};

type IdErrorKey = keyof typeof SIMPLE_STORAGE_POI_ERRORS;

const SIMPLE_STORAGE_POI_ERRORS = {
    NO_ID: "SimpleStoragePOI__NoIdentityNFT",
    SUSPENDED: "SimpleStoragePOI__Suspended",
    COMPETENCY_RATING: "SimpleStoragePOI__CompetencyRating",
    ATTRIBUTE_EXPIRED: "SimpleStoragePOI__AttributeExpired",
    ZERO_ADDRESS: "SimpleStoragePOI__ZeroAddress",
} as const satisfies Record<string, string>;

/**
 * Returns an error message from the `SimpleStoragePOI` contract.
 *
 * @function simpleStoragePOIErr
 * @param   {IdErrorKey} err
 * @returns {string}
 */
export function simpleStoragePOIErr(err: IdErrorKey): string {
    return SIMPLE_STORAGE_POI_ERRORS[err];
}

/* TEST DEPLOY
================================================== */
/**
 * Creates a new instances of SimpleStoragePOITest
 * @class   SimpleStoragePOITest
 */
export class SimpleStoragePOITest {
    /* Vars
    ======================================== */
    private _isInitialized: boolean;

    private _foundation!: HardhatEthersSigner;
    private _foundationAddress!: string;

    private _accounts!: HardhatEthersSigner[];
    private _accountAddresses!: string[];

    private _simpleStorageContract!: SimpleStoragePOI;
    private _simpleStorageContractAddress!: string;
    private _simpleStorageArgs!: SimpleStorageArgs;

    /* Init
    ======================================== */
    /**
     * Private constructor due to requirement for async init work.
     *
     * @constructor
     * @private
     */
    private constructor() {
        this._accounts = [];
        this._accountAddresses = [];

        this._isInitialized = false;
    }

    /**
     * Initializes `SimpleStoragePOITest`. `isInitialized` will return false until
     * this is run.
     *
     * # Error
     *
     * Will throw if any of the deployments are not successful
     *
     * @private
     * @async
     * @method  init
     * @param   {AddressLike} poiAddress
     * @returns {Promise<SimpleStoragePOITest>} - Promise that resolves to the `SimpleStoragePOITest`
     * @throws
     */
    private async init(poiAddress: AddressLike): Promise<SimpleStoragePOITest> {
        // Accounts
        const [foundation, ...rest] = await ethers.getSigners();

        this._foundation = foundation;
        this._foundationAddress = await foundation.getAddress();

        for (let i = 0; i < rest.length; ++i) {
            this._accounts.push(rest[i]);
            this._accountAddresses.push(await rest[i].getAddress());
        }

        // Simple Storage
        this._simpleStorageArgs = {
            adminAddress: this._foundationAddress,
            proofOfIdentityAddress: poiAddress,
            competencyRatingThreshold: 70n,
        };

        this._simpleStorageContract = await this.deploySimpleStorage(
            this._simpleStorageArgs
        );

        this._simpleStorageContractAddress =
            await this._simpleStorageContract.getAddress();

        this._isInitialized = true;

        return this;
    }

    /**
     * Static method to create a new instance of `SimpleStoragePOITest`, runs required
     * init and returns the instance.
     *
     * @public
     * @static
     * @async
     * @method  create
     * @param   {AddressLike} poiAddress
     * @returns {Promise<SimpleStoragePOITest>} - Promise that resolves to `SimpleStoragePOITest`
     */
    public static async create(
        poiAddress: AddressLike
    ): Promise<SimpleStoragePOITest> {
        const instance = new SimpleStoragePOITest();
        return await instance.init(poiAddress);
    }

    /* Test Contract Deployers
    ======================================== */
    /**
     * @method   deploySimpleStorage
     * @async
     * @public
     * @returns {Promise<SimpleStoragePOI>}
     */
    public async deploySimpleStorage(
        args: SimpleStorageArgs
    ): Promise<SimpleStoragePOI> {
        const f = await ethers.getContractFactory("SimpleStoragePOI");
        const c = await f.deploy(
            args.adminAddress,
            args.proofOfIdentityAddress,
            args.competencyRatingThreshold
        );

        return await c.waitForDeployment();
    }

    /* Getters
    ======================================== */
    /**
     * @method      foundation
     * @returns     {HardhatEthersSigner}
     * @throws
     */
    public get foundation(): HardhatEthersSigner {
        this.validateInitialized("foundation");
        return this._foundation;
    }

    /**
     * @method      foundationAddress
     * @returns     {string}
     * @throws
     */
    public get foundationAddress(): string {
        this.validateInitialized("foundationAddress");
        return this._foundationAddress;
    }

    /**
     * @method      accounts
     * @returns     {HardhatEthersSigner[]}
     * @throws
     */
    public get accounts(): HardhatEthersSigner[] {
        this.validateInitialized("accounts");
        return this._accounts;
    }

    /**
     * @method      accountAddresses
     * @returns     {string[]}
     * @throws
     */
    public get accountAddresses(): string[] {
        this.validateInitialized("accountAddresses");
        return this._accountAddresses;
    }

    /**
     * @method      simpleStorageContract
     * @returns     {SimpleStoragePOI}
     * @throws
     */
    public get simpleStorageContract(): SimpleStoragePOI {
        this.validateInitialized("simpleStorageContract");
        return this._simpleStorageContract;
    }

    /**
     * @method      simpleStorageContractAddress
     * @returns     {string}
     * @throws
     */
    public get simpleStorageContractAddress(): string {
        this.validateInitialized("simpleStorageContractAddress");
        return this._simpleStorageContractAddress;
    }

    /**
     * @method      simpleStorageArgs
     * @returns     {SimpleStorageArgs}
     * @throws
     */
    public get simpleStorageArgs(): SimpleStorageArgs {
        this.validateInitialized("simpleStorageArgs");
        return this._simpleStorageArgs;
    }

    /* Helpers
    ======================================== */
    /**
     *  Validates if the class instance has been initialized.
     *
     *  # Error
     *
     *  Will throw an error if the class instance has not been initialized.
     *
     *  @private
     *  @method     validateInitialized
     *  @param      {string}    method
     *  @throws
     */
    private validateInitialized(method: string): void {
        if (!this._isInitialized) {
            throw new Error(
                `Deployment not initialized. Call create() before accessing ${method}.`
            );
        }
    }
}
