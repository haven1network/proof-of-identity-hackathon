/**
 * One day in seconds.
 */
export const DAY_SEC = 86_400;

/**
 *  The zero, or null, address.
 */
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/**
 *  The interface ID for ERC721.
 */
export const ERC_721_INTERFACE_ID = "0x80ac58cd";

/**
 * Collection of regex for access control revert messages.
 */
const ACCESS_CONTROL_REVERSIONS = {
    MISSING_ROLE:
        /^AccessControl: account (0x[0-9a-f]{40}) is missing role (0x[0-9a-f]{64})$/,
} as const satisfies Record<string, RegExp>;

type AccessControlKey = keyof typeof ACCESS_CONTROL_REVERSIONS;

/**
 * Function to return the regex for an OZ `AccessControl` reversion message.
 *
 * @function accessControlErr
 * @param   {AccessControlKey} err
 * @returns {RegExp}
 */
export function accessControlErr(err: AccessControlKey): RegExp {
    return ACCESS_CONTROL_REVERSIONS[err];
}

const INITIALIZBLE_ERRORS = {
    ALREADY_INITIALIZED: "Initializable: contract is already initialized",
    IS_INITIALIZING: "Initializable: contract is initializing",
    NOT_INITIALIZING: "Initializable: contract is not initializing",
} as const satisfies Record<string, string>;

type InitializableError = keyof typeof INITIALIZBLE_ERRORS;

/**
 * Function to return an error message associated with the OZ `Initializalbe`
 * contract.
 *
 * @function initialiazbleErr
 * @param   {InitializableError} err
 * @returns {string}
 */
export function initialiazbleErr(err: InitializableError): string {
    return INITIALIZBLE_ERRORS[err];
}
