/* IMPORT NODE MODULES
================================================== */
import { ethers } from "hardhat";

/* IMPORT TYPES
================================================== */
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import type { AddressLike, BigNumberish } from "ethers";
import type { AuctionPOI, MockNFT } from "@typechain/index";

/* IMPORT CONSTANTS AND UILS
================================================== */
import { parseH1 } from "@utils/token";
import { DAY_SEC } from "../../../constants";

/* CONSTANTS, TYPES AND UTILS
================================================== */
export type AuctionArgs = {
    proofOfIdentityAddress: AddressLike;
    auctionType: AuctionTypeVal;
    auctionLength: number;
    startingBid: BigNumberish;
    nftAddress: AddressLike;
    nftId: BigNumberish;
};

type AuctionErrorKey = keyof typeof AUCTION_POI_ERRORS;

const AUCTION_POI_ERRORS = {
    ZERO_ADDRESS: "AuctionPOI__ZeroAddress",
    INVALID_AUCTION_TYPE: "AuctionPOI__InvalidAuctionType",
    INVALID_AUCTION_LENGTH: "AuctionPOI__InvalidAuctionLength",
    NOT_STARTED: "AuctionPOI__AuctionNotStarted",
    ACTIVE: "AuctionPOI__AuctionActive",
    FINISHED: "AuctionPOI__AuctionFinished",
    NO_ID: "AuctionPOI__NoIdentityNFT",
    SUSPENDED: "AuctionPOI__Suspended",
    ATTRIBUTE_EXPIRED: "AuctionPOI__AttributeExpired",
    USER_TYPE: "AuctionPOI__UserType",
    BID_TOO_LOW: "AuctionPOI__BidTooLow",
    ALREADY_HIGHEST: "AuctionPOI__AlreadyHighestBidder",
} as const satisfies Record<string, string>;

/**
 * Returns an error message from the `AuctionPOI` contract.
 *
 * @function    auctionPOIErr
 * @param       {AuctionErrorKey} err
 * @returns     {string}
 */
export function auctionPOIErr(err: AuctionErrorKey): string {
    return AUCTION_POI_ERRORS[err];
}

type AuctionTypeKey = keyof typeof AUCTION_TYPE;
type AuctionTypeVal = (typeof AUCTION_TYPE)[keyof typeof AUCTION_TYPE];

const AUCTION_TYPE = {
    RETAIL: 1,
    INSTITUTION: 2,
    ALL: 3,
} as const;

/**
 * Returns the numeric value associated with an auction type.
 *
 * @function    getAuctionType
 * @param       {AuctionTypeKey}    auction
 * @returns     {AuctionTypeVal}
 */
export function getAuctionType(auction: AuctionTypeKey): AuctionTypeVal {
    return AUCTION_TYPE[auction];
}

/* TEST DEPLOY
================================================== */
/**
 * Creates a new instances of AuctionPOITest
 * @class   AuctionPOITest
 */
export class AuctionPOITest {
    /* Vars
    ======================================== */
    private _isInitialized: boolean;

    private _foundation!: HardhatEthersSigner;
    private _foundationAddress!: string;

    private _accounts!: HardhatEthersSigner[];
    private _accountAddresses!: string[];

    private _nftContract!: MockNFT;
    private _nftContractAddress!: string;

    private _auctionContract!: AuctionPOI;
    private _auctionContractAddress!: string;
    private _auctionArgs!: AuctionArgs;

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
     * Initializes `AuctionPOITest`. `isInitialized` will return false until
     * this is run.
     *
     * Deploys an auction with a base config of:
     * -    Foundation as the owner;
     * -    "ALL" (`3`) as the type;
     * -    `1` as the NFT ID;
     * -    `10` H1 as the starting bid; and
     * -    Seven (7) days as the auction length.
     *
     * To deploy an auction with a different config, see:
     * `AuctionPOITest.deployAuction`.
     *
     * # Error
     *
     * Will throw if any of the deployments are not successful
     *
     * @private
     * @async
     * @method  init
     * @param   {AddressLike} poiAddress
     * @returns {Promise<AuctionPOITest>} - Promise that resolves to the `AuctionPOITest`
     * @throws
     */
    private async init(poiAddress: AddressLike): Promise<AuctionPOITest> {
        // Accounts
        const [foundation, ...rest] = await ethers.getSigners();

        this._foundation = foundation;
        this._foundationAddress = await foundation.getAddress();

        for (let i = 0; i < rest.length; ++i) {
            this._accounts.push(rest[i]);
            this._accountAddresses.push(await rest[i].getAddress());
        }

        // NFT
        this._nftContract = await this.deployNFT();
        this._nftContractAddress = await this._nftContract.getAddress();

        await this._nftContract.mint(this._foundationAddress);

        // Auction
        const nftId = 1;
        this._auctionArgs = {
            proofOfIdentityAddress: poiAddress,
            auctionType: getAuctionType("ALL"),
            nftId,
            nftAddress: this._nftContractAddress,
            startingBid: parseH1("10"),
            auctionLength: DAY_SEC * 7,
        };

        this._auctionContract = await this.deployAuction(this._auctionArgs);

        this._auctionContractAddress = await this._auctionContract.getAddress();

        // Approve the Auction contract to transfer the NFT from the Foundation
        const txRes = await this._nftContract.approve(
            this._auctionContractAddress,
            nftId
        );
        await txRes.wait();

        const bal = await this._nftContract.balanceOf(this._foundationAddress);

        if (bal != 1n) throw new Error("Auction: NFT transfer unsuccessful");

        this._isInitialized = true;

        return this;
    }

    /**
     * Static method to create a new instance of `AuctionPOITest`, runs required
     * init and returns the instance.
     *
     * Deploys an auction with a base config of:
     * -    Foundation as the owner;
     * -    "ALL" (`3`) as the type;
     * -    `1` as the NFT ID;
     * -    `10` H1 as the starting bid; and
     * -    Seven (7) days as the auction length.
     *
     * To deploy an auction with a different config, see:
     * `AuctionPOITest.deployAuction`.
     *
     * @public
     * @static
     * @async
     * @method  create
     * @param   {AddressLike} poiAddress
     * @returns {Promise<AuctionPOITest>} - Promise that resolves to `AuctionPOITest`
     */
    public static async create(
        poiAddress: AddressLike
    ): Promise<AuctionPOITest> {
        const instance = new AuctionPOITest();
        return await instance.init(poiAddress);
    }

    /* Test Contract Deployers
    ======================================== */
    /**
     * Deploys the NFT contract with a max supply of `10_000`.
     *
     * @method   deployNFT
     * @async
     * @public
     * @returns {Promise<MockNFT>}
     * @throws
     */
    public async deployNFT(): Promise<MockNFT> {
        const f = await ethers.getContractFactory("MockNFT");
        const c = await f.deploy(10_000);
        return await c.waitForDeployment();
    }

    /**
     * @method   deployAuction
     * @async
     * @public
     * @returns {Promise<AuctionPOI>}
     */
    public async deployAuction(args: AuctionArgs): Promise<AuctionPOI> {
        const f = await ethers.getContractFactory("AuctionPOI");
        const c = await f.deploy(
            args.proofOfIdentityAddress,
            args.auctionType,
            args.auctionLength,
            args.startingBid,
            args.nftAddress,
            args.nftId
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
     * @method      auctionContract
     * @returns     {AuctionPOI}
     * @throws
     */
    public get nftContract(): MockNFT {
        this.validateInitialized("nftContract");
        return this._nftContract;
    }

    /**
     * @method      nftContractAddress
     * @returns     {string}
     * @throws
     */
    public get nftContractAddress(): string {
        this.validateInitialized("nftContractAddress");
        return this._nftContractAddress;
    }

    /**
     * @method      auctionContract
     * @returns     {AuctionPOI}
     * @throws
     */
    public get auctionContract(): AuctionPOI {
        this.validateInitialized("auctionContract");
        return this._auctionContract;
    }

    /**
     * @method      auctionContractAddress
     * @returns     {string}
     * @throws
     */
    public get auctionContractAddress(): string {
        this.validateInitialized("auctionContractAddress");
        return this._auctionContractAddress;
    }

    /**
     * @method      auctionArgs
     * @returns     {AuctionArgs}
     * @throws
     */
    public get auctionArgs(): AuctionArgs {
        this.validateInitialized("simpleStorageArgs");
        return this._auctionArgs;
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
