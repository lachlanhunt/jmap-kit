import type { Id } from "../../common/types.js";
import type {
    BaseChangesRequestInvocationArgs,
    BaseChangesResponseInvocationArgs,
    BaseGetRequestInvocationArgs,
    BaseGetResponseInvocationArgs,
    BaseSetRequestInvocationArgs,
    BaseSetResponseInvocationArgs,
} from "../../invocation/types.js";
import type { EmailAddress } from "../email/types.js";

/**
 * IdentityObject properties set by the server. These cannot be set by an `Identity/set` call.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-6 | RFC 8621 Section 6: Identities}
 */
export type IdentityObjectServerSet = Readonly<{
    /**
     * (immutable; server-set) The id of the Identity.
     */
    id: Id;

    /**
     * (server-set) Is the user allowed to delete this Identity? Servers may wish to set this
     * to `false` for the user's username or other default address. Attempts to destroy an
     * Identity with `mayDelete: false` will be rejected with a standard `forbidden` SetError.
     */
    mayDelete: boolean;
}>;

/**
 * IdentityObject properties that may be set via an `Identity/set` call.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-6 | RFC 8621 Section 6: Identities}
 */
export type IdentityObjectSettable = {
    /**
     * (default: `""`) The `From` name the client SHOULD use when creating a new
     * Email from this Identity.
     */
    name?: string;

    /**
     * (immutable) The `From` email address the client MUST use when creating a new
     * Email from this Identity. If the `mailbox` part of the address (the section
     * before the `@`) is the single character `*` (e.g., `*@example.com`), the client
     * may use any valid address ending in that domain (e.g., `foo@example.com`).
     */
    readonly email: string;

    /**
     * (default: `null`) The Reply-To value the client SHOULD set when creating a new
     * Email from this Identity.
     *
     * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-4.1.2.3 | RFC 8621 Section 4.1.2.3}
     * for the definition of EmailAddress.
     */
    replyTo?: EmailAddress[] | null;

    /**
     * (default: `null`) The Bcc value the client SHOULD set when creating a new Email
     * from this Identity.
     *
     * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-4.1.2.3 | RFC 8621 Section 4.1.2.3}
     * for the definition of EmailAddress.
     */
    bcc?: EmailAddress[] | null;

    /**
     * (default: `""`) A signature the client SHOULD insert into new plaintext messages
     * that will be sent from this Identity. Clients MAY ignore this and/or combine this
     * with a client-specific signature preference.
     */
    textSignature?: string;

    /**
     * (default: `""`) A signature the client SHOULD insert into new HTML messages that
     * will be sent from this Identity. This text MUST be an HTML snippet to be inserted
     * into the `<body></body>` section of the HTML. Clients MAY ignore this and/or combine
     * this with a client-specific signature preference.
     */
    htmlSignature?: string;
};

/**
 * Properties of the Identity object.
 *
 * An Identity object stores information about an email address or domain the user may send from.
 * Multiple identities with the same email address MAY exist, to allow for different settings the
 * user wants to pick between (for example, with different names/signatures).
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc8621.html#section-6 | RFC 8621 Section 6: Identities}
 */
export type IdentityObject = IdentityObjectServerSet & IdentityObjectSettable;

/**
 * The arguments for fetching Identity objects via an `Identity/get` call.
 */
export type IdentityGetRequestInvocationArgs = BaseGetRequestInvocationArgs<IdentityObject>;

/**
 * The response to an `Identity/get` call.
 */
export type IdentityGetResponseInvocationArgs = BaseGetResponseInvocationArgs<IdentityObject>;

/**
 * The arguments for fetching Identity changes via an `Identity/changes` call.
 */
export type IdentityChangesRequestInvocationArgs = BaseChangesRequestInvocationArgs;

/**
 * The response to an `Identity/changes` call.
 */
export type IdentityChangesResponseInvocationArgs = BaseChangesResponseInvocationArgs;

/**
 * The arguments for creating, updating, and destroying Identity objects via an `Identity/set` call.
 */
export type IdentitySetRequestInvocationArgs = BaseSetRequestInvocationArgs<IdentityObjectSettable>;

/**
 * The response to an `Identity/set` call.
 */
export type IdentitySetResponseInvocationArgs = BaseSetResponseInvocationArgs<IdentityObject>;

/**
 * Union type of all Identity capability request invocation arguments.
 */
export type IdentityRequestInvocationArgs =
    | IdentityGetRequestInvocationArgs
    | IdentityChangesRequestInvocationArgs
    | IdentitySetRequestInvocationArgs;

/**
 * Union type of all Identity capability response invocation arguments.
 */
export type IdentityResponseInvocationArgs =
    | IdentityGetResponseInvocationArgs
    | IdentityChangesResponseInvocationArgs
    | IdentitySetResponseInvocationArgs;
