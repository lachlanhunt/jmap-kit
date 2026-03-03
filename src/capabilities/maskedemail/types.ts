// MaskedEmail types for the MaskedEmail JMAP capability
// See: https://www.fastmail.com/dev/maskedemail

import type {
    BaseGetRequestInvocationArgs,
    BaseGetResponseInvocationArgs,
    BaseSetRequestInvocationArgs,
    BaseSetResponseInvocationArgs,
} from "../../invocation/types.js";

/**
 * The state of a MaskedEmail address.
 * - pending: the initial state. Once set to anything else, it cannot be set back to pending. If a message is received by an address in the “pending” state, it will automatically be converted to “enabled”. Pending email addresses are automatically deleted 24h after creation.
 * - enabled: the address is active and receiving mail normally.
 * - disabled: the address is active, but mail is sent straight to trash.
 * - deleted: the address is inactive; any mail sent to the address is bounced.
 */
export type MaskedEmailState = "pending" | "enabled" | "disabled" | "deleted";

/**
 * Immutable, server-set properties for MaskedEmail objects
 */
export type MaskedEmailObjectServerSet = {
    /** The id of the masked email address (immutable; server-set). */
    id: string;
    /** The email address (immutable; server-set). */
    email: string;
    /** The date-time the most recent message was received at this email address, if any (server-set). */
    lastMessageAt: string | null;
    /** The date-time the email address was created (immutable; server-set). */
    createdAt: string;
    /** The name of the client that created this email address (immutable; server-set). */
    createdBy: string;
};

/**
 * Settable properties for MaskedEmail objects
 */
export type MaskedEmailObjectSettable = {
    /** The state of the masked email address (default: pending). */
    state?: MaskedEmailState;
    /** The domain name of the site this address was created for, e.g. “https://example.com”. */
    forDomain: string;
    /** A short description of what this email address is for. */
    description: string;
    /** A URL pointing back to the integrator’s use of this email address, e.g. a custom-uri to open a password manager (nullable). */
    url?: string | null;
    /** The prefix for the generated email address (optional, create-only). Must be <= 64 chars, only a-z, 0-9, _ */
    emailPrefix?: string;
};

/**
 * The MaskedEmail object type representing a masked email address (intersection of server-set and settable properties)
 */
export type MaskedEmailObject = MaskedEmailObjectServerSet & MaskedEmailObjectSettable;

/**
 * Arguments for MaskedEmail/get method.
 */
export type MaskedEmailGetRequestInvocationArgs = BaseGetRequestInvocationArgs<MaskedEmailObject>;

/**
 * Response for MaskedEmail/get method.
 */
export type MaskedEmailGetResponseInvocationArgs = BaseGetResponseInvocationArgs<MaskedEmailObject>;

/**
 * Arguments for MaskedEmail/set method.
 */
export type MaskedEmailSetRequestInvocationArgs = BaseSetRequestInvocationArgs<MaskedEmailObjectSettable>;

/**
 * Response for MaskedEmail/set method.
 */
export type MaskedEmailSetResponseInvocationArgs = BaseSetResponseInvocationArgs<MaskedEmailObject>;

/**
 * Union type of all MaskedEmail capability request invocation arguments
 */
export type MaskedEmailRequestInvocationArgs =
    | MaskedEmailGetRequestInvocationArgs
    | MaskedEmailSetRequestInvocationArgs;

/**
 * Union type of all MaskedEmail capability response invocation arguments
 */
export type MaskedEmailResponseInvocationArgs =
    | MaskedEmailGetResponseInvocationArgs
    | MaskedEmailSetResponseInvocationArgs;
