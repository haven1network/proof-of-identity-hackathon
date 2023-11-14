/* IMPORT NODE MODULES
================================================== */
import { ethers } from "hardhat";
import { AddressLike, BigNumberish, ContractTransactionReceipt } from "ethers";

/* IMPORT TYPES
================================================== */
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import type {
    MockAccountManager,
    MockPermissionsInterface,
    ProofOfIdentity,
} from "@typechain";

/* IMPORT CONSTANTS AND UTILS
================================================== */
import {
    type ProofOfIdentityArgs,
    deployProofOfIdentity,
} from "@utils/deploy/proof-of-identity";
import { addTime } from "@utils/time";
import { randomNumber } from "@utils/random";
import { generateDummyAddress } from "@utils/dummyAddresses";
import { randomCountryCode } from "./countries";

/* CONSTANTS, TYPES AND UTILS
================================================== */
export type IssueIdArgs = {
    account: AddressLike;
    primaryID: boolean;
    countryCode: string;
    proofOfLiveliness: boolean;
    userType: BigNumberish;
    expiries: [BigNumberish, BigNumberish, BigNumberish, BigNumberish];
    tokenURI: string;
};

export type UserTypeKey = keyof typeof USER_TYPE;
export type UserTypeVal = (typeof USER_TYPE)[keyof typeof USER_TYPE];

export const USER_TYPE = {
    RETAIL: 1,
    INSTITUTION: 2,
} as const;

/**
 * Returns the numeric value of a given user type.
 *
 * @function    userType
 * @param       {UserTypeKey}   key
 * @returns     {UserTypeVal}
 */
export function userType(key: UserTypeKey): UserTypeVal {
    return USER_TYPE[key];
}

type IdErrorKey = keyof typeof ID_ERRORS;

const ID_ERRORS = {
    INVALID_ATTRIBUTE: "ProofOfIdentity__InvalidAttribute",
    INVALID_EXPIRY: "ProofOfIdentity__InvalidExpiry",
    NOT_VERIFIED: "ProofOfIdentity__IsNotVerified",
    ALREADY_VERIFIED: "ProofOfIdentity__AlreadyVerified",
    NOT_TRANSFERABLE: "ProofOfIdentity__IDNotTransferable",
    INVALID_TOKEN_ID: "ProofOfIdentity__InvalidTokenID",
} as const satisfies Record<string, string>;

/**
 * Returns an error message from the `ProofOfIdentity` contract.
 *
 * @function idErr
 * @param   {IdErrorKey} err
 * @returns {string}
 */
export function idErr(err: IdErrorKey): string {
    return ID_ERRORS[err];
}
/**
 * Generates random proof of ID args to be used for testing.
 *
 * @function    randIdArgs
 * @param       {string}    [address]
 * @returns     {IssueIdArgs}
 */
export function randIdArgs(address?: string): IssueIdArgs {
    address ||= generateDummyAddress(randomNumber(1, 10001).toString());
    const primaryID = true;
    const countryCode = randomCountryCode();
    const proofOfLiveliness = true;
    const userType = randomNumber(1, 3);
    const expiries: [bigint, bigint, bigint, bigint] = [0n, 0n, 0n, 0n];
    const tokenURI = `testURI-${randomNumber(1, 11).toString()}`;

    const baseExp = addTime(Date.now(), randomNumber(1, 5), "years");

    // add in four different expiries - each one month apart
    for (let i = 0; i < 4; ++i) {
        const e = addTime(baseExp, i + 1, "months", "sec");
        expiries[i] = BigInt(e);
    }

    const args: IssueIdArgs = {
        account: address,
        primaryID,
        countryCode,
        proofOfLiveliness,
        userType,
        expiries,
        tokenURI,
    };

    return args;
}

/* TEST DEPLOY
================================================== */
/**
 * Creates a new instances of ProofOfIdTest
 * @class   ProofOfIdTest
 */
export class ProofOfIdTest {
    /* Vars
    ======================================== */
    private _isInitialized: boolean;

    private _foundation!: HardhatEthersSigner;
    private _foundationAddress!: string;

    private _networkOperator!: HardhatEthersSigner;
    private _networkOperatorAddress!: string;

    private _accounts!: HardhatEthersSigner[];
    private _accountAddresses!: string[];

    private _proofOfIdContract!: ProofOfIdentity;
    private _proofOfIdContractAddress!: string;
    private _proofOfIdArgs!: ProofOfIdentityArgs;

    private _mockAccountManager!: MockAccountManager;
    private _mockAccountManagerAddress!: string;

    private _mockPermissionsInterface!: MockPermissionsInterface;
    private _mockPermissionsInterfaceAddress!: string;

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
     * Initializes `ProofOfIdTest`. `isInitialized` will return false until
     * this is run.
     *
     * # Error
     *
     * Will throw if any of the deployments are not successful
     *
     * @private
     * @async
     * @method  init
     * @returns {Promise<ProofOfIdTest>} - Promise that resolves to the `ProofOfIdTest`
     * @throws
     */
    private async init(): Promise<ProofOfIdTest> {
        // Accounts
        const [foundation, op, ...rest] = await ethers.getSigners();

        this._foundation = foundation;
        this._foundationAddress = await foundation.getAddress();

        this._networkOperator = op;
        this._networkOperatorAddress = await op.getAddress();

        for (let i = 0; i < rest.length; ++i) {
            this._accounts.push(rest[i]);
            this._accountAddresses.push(await rest[i].getAddress());
        }

        // Account Manager
        this._mockAccountManager = await this.deployMockAccountManager();
        this._mockAccountManagerAddress =
            await this._mockAccountManager.getAddress();

        // Permissions Interface
        this._mockPermissionsInterface =
            await this.deployMockPermissionsInterface(
                this._mockAccountManagerAddress
            );
        this._mockPermissionsInterfaceAddress =
            await this._mockPermissionsInterface.getAddress();

        // Proof of Identity
        this._proofOfIdArgs = {
            foundationAddress: this._foundationAddress,
            networkOperatorAddress: this._networkOperatorAddress,
            permissionsInterfaceAddress: this._mockPermissionsInterfaceAddress,
            accountManagerAddress: this._mockAccountManagerAddress,
        };

        this._proofOfIdContract = await deployProofOfIdentity(
            this._proofOfIdArgs,
            foundation
        );

        this._proofOfIdContractAddress =
            await this._proofOfIdContract.getAddress();

        this._isInitialized = true;

        return this;
    }

    /**
     * Static method to create a new instance of `ProofOfIdTest`, runs required
     * init and returns the instance.
     *
     * @public
     * @static
     * @async
     * @method  create
     * @returns {Promise<ProofOfIdTest>} - Promise that resolves to `ProofOfIdTest`
     */
    public static async create(): Promise<ProofOfIdTest> {
        const instance = new ProofOfIdTest();
        return await instance.init();
    }

    /* Test Contract Deployers
    ======================================== */
    /**
     * @method   deployMockAccountManager
     * @async
     * @public
     * @returns {Promise<MockAccountManager>}
     */
    public async deployMockAccountManager(): Promise<MockAccountManager> {
        const f = await ethers.getContractFactory("MockAccountManager");
        const c = await f.deploy();
        return await c.waitForDeployment();
    }
    /**
     * @method   deployMockPermissionsInterface
     * @async
     * @public
     * @returns {Promise<MockPermissionsInterface>}
     */
    public async deployMockPermissionsInterface(
        accountManager: string
    ): Promise<MockPermissionsInterface> {
        const f = await ethers.getContractFactory("MockPermissionsInterface");
        const c = await f.deploy(accountManager);
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
     * @method      networkOperator
     * @returns     {HardhatEthersSigner}
     * @throws
     */
    public get networkOperator(): HardhatEthersSigner {
        this.validateInitialized("networkOperator");
        return this._networkOperator;
    }

    /**
     * @method      networkOperatorAddress
     * @returns     {string}
     * @throws
     */
    public get networkOperatorAddress(): string {
        this.validateInitialized("networkOperatorAddress");
        return this._networkOperatorAddress;
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
     * @method      proofOfIdContract
     * @returns     {ProofOfIdentity}
     * @throws
     */
    public get proofOfIdContract(): ProofOfIdentity {
        this.validateInitialized("proofOfIdContract");
        return this._proofOfIdContract;
    }

    /**
     * @method      proofOfIdContractAddress
     * @returns     {string}
     * @throws
     */
    public get proofOfIdContractAddress(): string {
        this.validateInitialized("proofOfIdContractAddress");
        return this._proofOfIdContractAddress;
    }

    /**
     * @method      mockAccountManager
     * @returns     {MockAccountManager}
     * @throws
     */
    public get mockAccountManager(): MockAccountManager {
        this.validateInitialized("mockAccountManager");
        return this._mockAccountManager;
    }

    /**
     * @method      mockAccountManager
     * @returns     {string}
     * @throws
     */
    public get mockAccountManagerAddress(): string {
        this.validateInitialized("mockAccountManagerAddress");
        return this._mockAccountManagerAddress;
    }

    /**
     * @method      mockPermissionsInterface
     * @returns     {MockPermissionsInterface}
     * @throws
     */
    public get mockPermissionsInterface(): MockPermissionsInterface {
        this.validateInitialized("mockPermissionsInterface");
        return this._mockPermissionsInterface;
    }

    /**
     * @method      mockPermissionsInterfaceAddress
     * @returns     {string}
     * @throws
     */
    public get mockPermissionsInterfaceAddress(): string {
        this.validateInitialized("mockPermissionsInterfaceAddress");
        return this._mockPermissionsInterfaceAddress;
    }

    /**
     * @method      proofOfIdArgs
     * @returns     {ProofOfIdentityArgs}
     * @throws
     */
    public get proofOfIdArgs(): ProofOfIdentityArgs {
        this.validateInitialized("proofOfIdArgs");
        return this._proofOfIdArgs;
    }

    /* Helpers
    ======================================== */
    /**
     * Issues an ID and returns the transaction reciept.
     *
     * @async
     * @func    issueIdentity
     * @param   {IssueIdArgs}           args
     * @param   {HardhatEthersSigner}   [signer]
     * @returns {ContractTransactionReceipt | null}
     */
    public async issueIdentity(
        args: IssueIdArgs,
        signer?: HardhatEthersSigner
    ): Promise<ContractTransactionReceipt | null> {
        this.validateInitialized("issueIdentity");

        const c = signer
            ? this._proofOfIdContract.connect(signer)
            : this._proofOfIdContract;

        const txRes = await c.issueIdentity(
            args.account,
            args.primaryID,
            args.countryCode,
            args.proofOfLiveliness,
            args.userType,
            args.expiries,
            args.tokenURI
        );

        return await txRes.wait();
    }

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
